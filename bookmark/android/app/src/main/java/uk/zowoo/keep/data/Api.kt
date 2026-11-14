package uk.zowoo.keep.data

import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import uk.zowoo.keep.auth.AuthStore
import uk.zowoo.keep.auth.Session
import java.io.IOException

/** [serverMessage] is the server's `{"error"}` text, if it sent one; never a client-made string. */
class ApiException(val status: Int, val serverMessage: String? = null) : IOException(serverMessage ?: "HTTP $status")

/** Blocking API client; call from Dispatchers.IO. Any 401 on an authenticated call signs the user out locally. */
class Api(
    private val client: OkHttpClient,
    baseUrl: String,
    private val auth: AuthStore,
) {
    private val base: HttpUrl = baseUrl.toHttpUrl()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    fun exchangeToken(code: String, verifier: String): Session {
        val body = JSONObject().put("code", code).put("verifier", verifier).toString()
        val text = execute(Request.Builder().url(url("auth/app/token")).post(body.json()).build(), authed = false)
        val o = JSONObject(text)
        val token = o.optString("token").takeIf { it.isNotBlank() } ?: throw ApiException(500)
        val user = ApiJson.parseUser(o.optJSONObject("user")) ?: throw ApiException(500)
        return Session(token, user)
    }

    fun logout(token: String) {
        val req = Request.Builder().url(url("auth/logout"))
            .header("Authorization", "Bearer $token")
            .post(ByteArray(0).toRequestBody(null))
            .build()
        client.newCall(req).execute().close()
    }

    fun list(cursor: String?, query: String, unreadOnly: Boolean, limit: Int = 50): BookmarkPage {
        val u = url("api/bookmarks").newBuilder()
            .addQueryParameter("limit", limit.toString())
            .addQueryParameter("filter", if (unreadOnly) "unread" else "all")
            .apply {
                if (!cursor.isNullOrBlank()) addQueryParameter("cursor", cursor)
                if (query.isNotBlank()) addQueryParameter("q", query)
            }
            .build()
        return ApiJson.parsePage(execute(Request.Builder().url(u).get().build()))
    }

    /** Returns the HTTP status; throws IOException only when no response was received. */
    fun createBookmark(item: PendingItem): Int {
        val body = JSONObject()
            .put("id", item.id)
            .put("text", item.text)
            .put("title", item.title ?: JSONObject.NULL)
            .put("createdAt", item.createdAt)
            .toString()
        return send(Request.Builder().url(url("api/bookmarks")).post(body.json()).build(), authed = true).first
    }

    fun setRead(id: String, read: Boolean): Bookmark? {
        val body = JSONObject().put("read", read).toString()
        return ApiJson.parseItem(execute(Request.Builder().url(item(id)).patch(body.json()).build()))
    }

    fun delete(id: String) {
        execute(Request.Builder().url(item(id)).delete().build())
    }

    fun restore(id: String): Bookmark? {
        val u = item(id).newBuilder().addPathSegment("restore").build()
        return ApiJson.parseItem(execute(Request.Builder().url(u).post(ByteArray(0).toRequestBody(null)).build()))
    }

    private fun execute(request: Request, authed: Boolean = true): String {
        val (status, body) = send(request, authed)
        if (status !in 200..299) throw ApiException(status, ApiJson.errorMessage(body))
        return body
    }

    private fun send(request: Request, authed: Boolean): Pair<Int, String> {
        val token = if (authed) auth.token ?: return 401 to "" else null
        val req = if (token != null) request.newBuilder().header("Authorization", "Bearer $token").build() else request
        client.newCall(req).execute().use { resp ->
            val body = resp.body.string()
            if (resp.code == 401 && token != null) auth.onUnauthorized(token)
            return resp.code to body
        }
    }

    private fun url(path: String): HttpUrl = base.newBuilder().addPathSegments(path).build()

    private fun item(id: String): HttpUrl = base.newBuilder().addPathSegments("api/bookmarks").addPathSegment(id).build()

    private fun String.json(): RequestBody = toRequestBody(jsonType)
}
