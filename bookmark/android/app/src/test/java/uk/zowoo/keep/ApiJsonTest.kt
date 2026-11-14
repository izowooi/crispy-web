package uk.zowoo.keep

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import uk.zowoo.keep.data.ApiJson
import uk.zowoo.keep.data.SharedText

class ApiJsonTest {

    @Test
    fun parsesFullBookmarkAndIgnoresUnknownKeys() {
        val body = """
            {"items":[{"id":"b1","url":"https://www.example.com/a","title":"T","note":"n","description":"d",
              "image":"https://img/x.png","siteName":"Example","favicon":"https://f/i.ico","domain":"example.com",
              "createdAt":1700000000000,"readAt":1700000001000,"tags":["x"],"future":{"nested":true}}],
             "nextCursor":"c2","extra":42}
        """.trimIndent()
        val page = ApiJson.parsePage(body)
        assertEquals("c2", page.nextCursor)
        val b = page.items.single()
        assertEquals("b1", b.id)
        assertEquals("https://www.example.com/a", b.url)
        assertEquals("Example", b.siteName)
        assertEquals(1_700_000_000_000L, b.createdAt)
        assertEquals(1_700_000_001_000L, b.readAt)
        assertTrue(b.isRead)
    }

    @Test
    fun toleratesMissingAndNullOptionalFields() {
        val body = """{"items":[{"id":"b2","url":null,"title":"note only","image":null,"readAt":null},
            {"id":"b3","url":"https://www.news.example.org/p"}],"nextCursor":null}"""
        val page = ApiJson.parsePage(body)
        assertNull(page.nextCursor)
        val (noteOnly, minimal) = page.items
        assertNull(noteOnly.url)
        assertNull(noteOnly.image)
        assertNull(noteOnly.favicon)
        assertNull(noteOnly.readAt)
        assertFalse(noteOnly.isRead)
        assertEquals("", noteOnly.note)
        assertEquals("", noteOnly.domain)
        assertEquals(0L, noteOnly.createdAt)
        // Domain falls back to the URL host when the server omits it.
        assertEquals("news.example.org", minimal.domain)
        assertEquals("", minimal.title)
    }

    @Test
    fun skipsItemsWithoutIdAndMissingItemsArray() {
        assertTrue(ApiJson.parsePage("""{}""").items.isEmpty())
        val page = ApiJson.parsePage("""{"items":[{"title":"no id"},{"id":""},{"id":"ok"},"garbage"]}""")
        assertEquals(listOf("ok"), page.items.map { it.id })
    }

    @Test
    fun acceptsNumbersAsStringsAndFloats() {
        val b = ApiJson.parseBookmark(JSONObject("""{"id":5,"createdAt":"1700000000000","readAt":1.7E12}"""))!!
        assertEquals("5", b.id)
        assertEquals(1_700_000_000_000L, b.createdAt)
        assertEquals(1_700_000_000_000L, b.readAt)
    }

    @Test
    fun parsesItemEnvelopeAndUser() {
        val item = ApiJson.parseItem("""{"item":{"id":"x","title":"t"},"duplicate":true}""")
        assertEquals("x", item?.id)
        assertNull(ApiJson.parseItem("not json"))

        val user = ApiJson.parseUser(JSONObject("""{"id":"u1","email":"a@b.c","picture":null,"role":"admin"}"""))!!
        assertEquals("a@b.c", user.email)
        assertEquals("", user.name)
        assertNull(user.picture)
        assertNull(ApiJson.parseUser(JSONObject("""{"email":"no-id"}""")))
    }

    @Test
    fun cacheRoundTripPreservesNulls() {
        val page = ApiJson.parsePage("""{"items":[{"id":"a","url":null,"readAt":null,"createdAt":1}],"nextCursor":"n"}""")
        val again = ApiJson.parsePage(ApiJson.pageToJson(page))
        assertEquals(page, again)
    }

    @Test
    fun errorMessageExtraction() {
        assertEquals("bad url", ApiJson.errorMessage("""{"error":"bad url"}"""))
        assertNull(ApiJson.errorMessage("<html>502</html>"))
        assertNull(ApiJson.errorMessage(""))
    }

    @Test
    fun firstUrlFromMixedSharedText() {
        assertEquals("https://example.com/a?b=1", SharedText.firstUrl("Great read https://example.com/a?b=1."))
        assertNull(SharedText.firstUrl("just a note"))
    }
}
