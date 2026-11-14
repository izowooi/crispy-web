package uk.zowoo.keep.data

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.net.URI

data class User(val id: String, val email: String, val name: String, val picture: String?)

data class Bookmark(
    val id: String,
    val url: String?,
    val title: String,
    val note: String,
    val description: String,
    val image: String?,
    val siteName: String,
    val favicon: String?,
    val domain: String,
    val createdAt: Long,
    val readAt: Long?,
) {
    val isRead: Boolean get() = readAt != null
}

data class BookmarkPage(val items: List<Bookmark>, val nextCursor: String?)

/** Lenient JSON mapping: unknown keys are ignored and missing optional fields fall back to defaults. */
object ApiJson {

    fun parseUser(o: JSONObject?): User? {
        if (o == null) return null
        val id = o.str("id") ?: return null
        return User(
            id = id,
            email = o.str("email").orEmpty(),
            name = o.str("name").orEmpty(),
            picture = o.str("picture")?.takeIf { it.isNotBlank() },
        )
    }

    fun parseBookmark(o: JSONObject?): Bookmark? {
        if (o == null) return null
        val id = o.str("id")?.takeIf { it.isNotBlank() } ?: return null
        val url = o.str("url")?.takeIf { it.isNotBlank() }
        return Bookmark(
            id = id,
            url = url,
            title = o.str("title").orEmpty(),
            note = o.str("note").orEmpty(),
            description = o.str("description").orEmpty(),
            image = o.str("image")?.takeIf { it.isNotBlank() },
            siteName = o.str("siteName").orEmpty(),
            favicon = o.str("favicon")?.takeIf { it.isNotBlank() },
            domain = o.str("domain")?.takeIf { it.isNotBlank() } ?: hostOf(url).orEmpty(),
            createdAt = o.num("createdAt") ?: 0L,
            readAt = o.num("readAt"),
        )
    }

    fun parsePage(body: String): BookmarkPage {
        val o = JSONObject(body)
        val arr = o.optJSONArray("items") ?: JSONArray()
        val items = (0 until arr.length()).mapNotNull { parseBookmark(arr.optJSONObject(it)) }
        return BookmarkPage(items, o.str("nextCursor")?.takeIf { it.isNotBlank() })
    }

    /** Parses `{ item: Bookmark }` responses (PATCH / restore). */
    fun parseItem(body: String): Bookmark? = runCatching { parseBookmark(JSONObject(body).optJSONObject("item")) }.getOrNull()

    fun errorMessage(body: String?): String? {
        if (body.isNullOrBlank()) return null
        return try {
            JSONObject(body).str("error")?.takeIf { it.isNotBlank() }
        } catch (_: JSONException) {
            null
        }
    }

    fun bookmarkToJson(b: Bookmark): JSONObject = JSONObject()
        .put("id", b.id)
        .put("url", b.url ?: JSONObject.NULL)
        .put("title", b.title)
        .put("note", b.note)
        .put("description", b.description)
        .put("image", b.image ?: JSONObject.NULL)
        .put("siteName", b.siteName)
        .put("favicon", b.favicon ?: JSONObject.NULL)
        .put("domain", b.domain)
        .put("createdAt", b.createdAt)
        .put("readAt", b.readAt ?: JSONObject.NULL)

    fun userToJson(u: User): JSONObject = JSONObject()
        .put("id", u.id).put("email", u.email).put("name", u.name).put("picture", u.picture ?: JSONObject.NULL)

    fun pageToJson(page: BookmarkPage): String = JSONObject()
        .put("items", JSONArray().apply { page.items.forEach { put(bookmarkToJson(it)) } })
        .put("nextCursor", page.nextCursor ?: JSONObject.NULL)
        .toString()

    fun hostOf(url: String?): String? {
        if (url.isNullOrBlank()) return null
        val host = runCatching { URI(url).host }.getOrNull() ?: return null
        return host.removePrefix("www.")
    }

    // org.json's optString() turns JSON null into the string "null" on Android; avoid that.
    private fun JSONObject.str(key: String): String? {
        if (!has(key) || isNull(key)) return null
        return when (val v = opt(key)) {
            is String -> v
            is Number, is Boolean -> v.toString()
            else -> null
        }
    }

    private fun JSONObject.num(key: String): Long? {
        if (!has(key) || isNull(key)) return null
        return when (val v = opt(key)) {
            is Number -> v.toLong()
            is String -> v.toLongOrNull() ?: v.toDoubleOrNull()?.toLong()
            else -> null
        }
    }
}

/** Best-effort extraction of the first http(s) URL in shared text, used only for the share card preview. */
object SharedText {
    private val urlRegex = Regex("""https?://[^\s<>"]+""", RegexOption.IGNORE_CASE)

    fun firstUrl(text: String): String? = urlRegex.find(text)?.value?.trimEnd('.', ',', ')', ']', '>', '"', '\'')
}
