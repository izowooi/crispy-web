package uk.zowoo.keep.auth

import android.content.Context
import androidx.core.content.edit
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject
import uk.zowoo.keep.data.ApiJson
import uk.zowoo.keep.data.User

data class Session(val token: String, val user: User)

class AuthStore(context: Context) {
    private val prefs = context.getSharedPreferences("auth", Context.MODE_PRIVATE)
    private val _session = MutableStateFlow(load())
    val session: StateFlow<Session?> = _session.asStateFlow()

    val token: String? get() = _session.value?.token

    fun save(session: Session) {
        prefs.edit {
            putString(KEY_TOKEN, session.token)
            putString(KEY_USER, ApiJson.userToJson(session.user).toString())
            remove(KEY_VERIFIER)
        }
        _session.value = session
    }

    fun clear() {
        prefs.edit { remove(KEY_TOKEN); remove(KEY_USER) }
        _session.value = null
    }

    /** Only clears when the rejected token is still the current one, so a stale request can't log out a fresh sign-in. */
    fun onUnauthorized(rejectedToken: String) {
        if (_session.value?.token == rejectedToken) clear()
    }

    var verifier: String?
        get() = prefs.getString(KEY_VERIFIER, null)
        set(value) = prefs.edit(commit = true) { putString(KEY_VERIFIER, value) }

    private fun load(): Session? {
        val token = prefs.getString(KEY_TOKEN, null) ?: return null
        val user = prefs.getString(KEY_USER, null)
            ?.let { runCatching { ApiJson.parseUser(JSONObject(it)) }.getOrNull() }
            ?: return null
        return Session(token, user)
    }

    private companion object {
        const val KEY_TOKEN = "token"
        const val KEY_USER = "user"
        const val KEY_VERIFIER = "pkce_verifier"
    }
}
