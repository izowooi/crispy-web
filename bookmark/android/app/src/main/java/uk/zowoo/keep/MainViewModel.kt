package uk.zowoo.keep

import android.app.Application
import androidx.annotation.StringRes
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import uk.zowoo.keep.auth.Session
import uk.zowoo.keep.data.ApiException
import uk.zowoo.keep.data.Bookmark
import uk.zowoo.keep.data.BookmarkPage
import uk.zowoo.keep.work.UploadWorker
import java.io.IOException

data class ListState(
    val items: List<Bookmark> = emptyList(),
    val nextCursor: String? = null,
    /** True once any data (cache or network) has been shown for the current view. */
    val loaded: Boolean = false,
    val refreshing: Boolean = false,
    val loadingMore: Boolean = false,
    val error: String? = null,
    val unreadOnly: Boolean = false,
    val query: String = "",
)

sealed interface UiEvent {
    data class Message(val text: String) : UiEvent
    data class Deleted(val bookmark: Bookmark) : UiEvent
}

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as ZKeepApp

    val session: StateFlow<Session?> = app.auth.session
    val pendingCount: StateFlow<Int> = app.queue.count

    private val _list = MutableStateFlow(ListState())
    val list: StateFlow<ListState> = _list.asStateFlow()

    private val _signingIn = MutableStateFlow(false)
    val signingIn: StateFlow<Boolean> = _signingIn.asStateFlow()

    private val _signInError = MutableStateFlow<String?>(null)
    val signInError: StateFlow<String?> = _signInError.asStateFlow()

    private val events = Channel<UiEvent>(Channel.BUFFERED)
    val uiEvents = events.receiveAsFlow()

    private val queryInput = MutableStateFlow("")
    private var refreshJob: Job? = null
    private var loadMoreJob: Job? = null
    private val pendingDeletes = HashMap<String, Job>()
    private val lastDeletedIndex = HashMap<String, Int>()

    init {
        viewModelScope.launch {
            if (session.value != null) {
                val cached = withContext(Dispatchers.IO) { app.cache.load() }
                if (cached != null && !_list.value.loaded) {
                    _list.update { it.copy(items = cached.items, nextCursor = cached.nextCursor, loaded = true) }
                }
            }
        }
        viewModelScope.launch {
            session.collect { s ->
                if (s == null) {
                    _list.value = ListState()
                    withContext(Dispatchers.IO) { app.cache.clear() }
                } else {
                    refresh()
                    flushQueue()
                }
            }
        }
        viewModelScope.launch {
            withContext(Dispatchers.IO) { app.queue.all() }
            var last = pendingCount.value
            pendingCount.collect { n ->
                // A queued share just landed on the server: pull it into the list.
                if (n in 0 until last && session.value != null) refresh(silent = true)
                last = n
            }
        }
        @OptIn(FlowPreview::class)
        viewModelScope.launch {
            queryInput.drop(1).debounce(350).distinctUntilChanged().collect { refresh() }
        }
    }

    fun onQueryChange(q: String) {
        _list.update { it.copy(query = q) }
        queryInput.value = q.trim()
    }

    fun setUnreadOnly(unreadOnly: Boolean) {
        if (_list.value.unreadOnly == unreadOnly) return
        _list.update { it.copy(unreadOnly = unreadOnly) }
        refresh()
    }

    fun refresh(silent: Boolean = false) {
        if (session.value == null) return
        refreshJob?.cancel()
        if (!silent) loadMoreJob?.cancel()
        val unreadOnly = _list.value.unreadOnly
        val query = queryInput.value
        refreshJob = viewModelScope.launch {
            if (!silent) _list.update { it.copy(refreshing = true, error = null) }
            try {
                val page = io { app.api.list(null, query, unreadOnly) }
                _list.update {
                    if (silent && it.items.size > page.items.size) {
                        // Background refresh after an upload: merge page 1 on top so a deep scroll isn't reset.
                        val fresh = page.items.mapTo(HashSet()) { b -> b.id }
                        it.copy(items = page.items + it.items.filterNot { b -> b.id in fresh }, error = null)
                    } else {
                        it.copy(items = page.items, nextCursor = page.nextCursor, loaded = true, refreshing = false, error = null)
                    }
                }
                persistIfDefaultView()
            } catch (e: IOException) {
                val msg = errorText(e)
                _list.update { it.copy(refreshing = false, error = if (it.items.isEmpty()) msg else null) }
                if (_list.value.items.isNotEmpty() && !silent) events.send(UiEvent.Message(msg))
            }
        }
    }

    fun loadMore() {
        val s = _list.value
        val cursor = s.nextCursor ?: return
        if (s.loadingMore || s.refreshing || loadMoreJob?.isActive == true) return
        loadMoreJob = viewModelScope.launch {
            _list.update { it.copy(loadingMore = true) }
            try {
                val page = io { app.api.list(cursor, queryInput.value, s.unreadOnly) }
                _list.update { cur ->
                    val known = cur.items.mapTo(HashSet()) { it.id }
                    cur.copy(
                        items = cur.items + page.items.filter { it.id !in known },
                        nextCursor = page.nextCursor,
                        loadingMore = false,
                    )
                }
            } catch (e: IOException) {
                _list.update { it.copy(loadingMore = false) }
                events.send(UiEvent.Message(errorText(e)))
            }
        }
    }

    fun setRead(b: Bookmark, read: Boolean) {
        val optimistic = b.copy(readAt = if (read) System.currentTimeMillis() else null)
        replace(optimistic)
        viewModelScope.launch {
            try {
                val server = io { app.api.setRead(b.id, read) }
                if (server != null) replace(server)
                persistIfDefaultView()
            } catch (e: IOException) {
                replace(b)
                events.send(UiEvent.Message(errorText(e)))
            }
        }
    }

    fun delete(b: Bookmark) {
        val index = _list.value.items.indexOfFirst { it.id == b.id }
        if (index < 0) return
        _list.update { it.copy(items = it.items.filterNot { x -> x.id == b.id }) }
        pendingDeletes[b.id] = viewModelScope.launch {
            try {
                io { app.api.delete(b.id) }
                persistIfDefaultView()
            } catch (e: IOException) {
                reinsert(b, index)
                events.send(UiEvent.Message(errorText(e)))
            }
        }
        viewModelScope.launch { events.send(UiEvent.Deleted(b)) }
        lastDeletedIndex[b.id] = index
    }


    fun undoDelete(b: Bookmark) {
        val index = lastDeletedIndex.remove(b.id) ?: 0
        viewModelScope.launch {
            pendingDeletes.remove(b.id)?.join()
            try {
                val restored = io { app.api.restore(b.id) } ?: b
                reinsert(restored, index)
                persistIfDefaultView()
            } catch (e: IOException) {
                events.send(UiEvent.Message(errorText(e)))
            }
        }
    }

    fun completeSignIn(code: String) {
        val verifier = app.auth.verifier
        if (verifier == null) {
            _signInError.value = app.getString(R.string.sign_in_failed_retry)
            return
        }
        _signingIn.value = true
        _signInError.value = null
        viewModelScope.launch {
            try {
                val s = io { app.api.exchangeToken(code, verifier) }
                app.auth.save(s)
            } catch (e: ApiException) {
                _signInError.value = e.serverMessage ?: str(R.string.sign_in_failed_retry)
            } catch (e: IOException) {
                _signInError.value = errorText(e)
            } finally {
                _signingIn.value = false
            }
        }
    }

    fun signInFailed(message: String?) {
        _signingIn.value = false
        _signInError.value = message?.takeIf { it.isNotBlank() } ?: app.getString(R.string.sign_in_failed_retry)
    }

    fun signOut() {
        val token = app.auth.token ?: return
        app.auth.clear()
        app.appScope.launch { runCatching { app.api.logout(token) } }
    }

    private fun flushQueue() {
        viewModelScope.launch {
            val pending = io { app.queue.all().size }
            if (pending > 0) UploadWorker.enqueue(app)
        }
    }

    private fun replace(b: Bookmark) {
        _list.update { s -> s.copy(items = s.items.map { if (it.id == b.id) b else it }) }
    }

    private fun reinsert(b: Bookmark, index: Int) {
        _list.update { s ->
            if (s.items.any { it.id == b.id }) s
            else s.copy(items = s.items.toMutableList().apply { add(index.coerceIn(0, size), b) })
        }
    }

    private suspend fun persistIfDefaultView() {
        val s = _list.value
        if (s.unreadOnly || queryInput.value.isNotEmpty()) return
        val page = BookmarkPage(s.items.take(50), s.nextCursor)
        io { app.cache.save(page) }
    }

    private fun errorText(e: IOException): String = when {
        e is ApiException && e.status == 401 -> str(R.string.error_signed_out)
        e is ApiException -> e.serverMessage ?: str(R.string.error_server)
        else -> str(R.string.error_network)
    }

    private fun str(@StringRes id: Int) = app.getString(id)

    private suspend fun <T> io(block: () -> T): T = withContext(Dispatchers.IO) { block() }
}
