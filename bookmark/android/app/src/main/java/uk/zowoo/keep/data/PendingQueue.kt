package uk.zowoo.keep.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption

data class PendingItem(val id: String, val text: String, val title: String?, val createdAt: Long)

/**
 * Durable FIFO of shares not yet uploaded. One JSON file, rewritten atomically (temp + fsync + rename)
 * so a crash mid-write never loses previously queued items. Shared by ShareActivity and UploadWorker.
 */
class PendingQueue(private val file: File) {
    private val lock = Any()
    private val _count = MutableStateFlow(-1)

    /** Number of pending items; -1 until first read. */
    val count: StateFlow<Int> = _count.asStateFlow()

    fun all(): List<PendingItem> = synchronized(lock) { read().also { _count.value = it.size } }

    /** Returns false (and changes nothing) if an item with the same id is already queued. */
    fun add(item: PendingItem): Boolean = synchronized(lock) {
        val items = read()
        if (items.any { it.id == item.id }) {
            _count.value = items.size
            return false
        }
        write(items + item)
        true
    }

    /** Returns true if the item was still queued (i.e. not yet uploaded). */
    fun remove(id: String): Boolean = synchronized(lock) {
        val items = read()
        val remaining = items.filterNot { it.id == id }
        if (remaining.size == items.size) {
            _count.value = items.size
            return false
        }
        write(remaining)
        true
    }

    private fun read(): List<PendingItem> {
        if (!file.isFile) return emptyList()
        return try {
            val arr = JSONArray(file.readText())
            (0 until arr.length()).mapNotNull { i ->
                val o = arr.optJSONObject(i) ?: return@mapNotNull null
                val id = o.optString("id").takeIf { it.isNotBlank() } ?: return@mapNotNull null
                PendingItem(
                    id = id,
                    text = o.optString("text"),
                    title = if (o.isNull("title")) null else o.optString("title"),
                    createdAt = o.optLong("createdAt"),
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun write(items: List<PendingItem>) {
        file.parentFile?.mkdirs()
        val arr = JSONArray()
        items.forEach {
            arr.put(
                JSONObject()
                    .put("id", it.id)
                    .put("text", it.text)
                    .put("title", it.title ?: JSONObject.NULL)
                    .put("createdAt", it.createdAt)
            )
        }
        val tmp = File(file.parentFile, file.name + ".tmp")
        FileOutputStream(tmp).use { out ->
            out.write(arr.toString().toByteArray(Charsets.UTF_8))
            out.fd.sync()
        }
        Files.move(tmp.toPath(), file.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
        _count.value = items.size
    }
}
