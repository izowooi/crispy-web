package uk.zowoo.keep

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import uk.zowoo.keep.data.PendingItem
import uk.zowoo.keep.data.PendingQueue
import java.io.File

class PendingQueueTest {
    @get:Rule
    val tmp = TemporaryFolder()

    private fun file() = File(tmp.root, "pending.json")
    private fun item(id: String, title: String? = "t-$id") = PendingItem(id, "https://example.com/$id", title, 1_700_000_000_000L)

    @Test
    fun addPersistsAcrossInstancesInOrder() {
        val q = PendingQueue(file())
        assertTrue(q.add(item("a")))
        assertTrue(q.add(item("b", title = null)))

        val reopened = PendingQueue(file()).all()
        assertEquals(listOf("a", "b"), reopened.map { it.id })
        assertEquals("t-a", reopened[0].title)
        assertNull(reopened[1].title)
        assertEquals("https://example.com/b", reopened[1].text)
        assertEquals(1_700_000_000_000L, reopened[1].createdAt)
    }

    @Test
    fun addIsIdempotentById() {
        val q = PendingQueue(file())
        assertTrue(q.add(item("a")))
        assertFalse(q.add(item("a")))
        assertEquals(1, q.all().size)
        assertEquals(1, q.count.value)
    }

    @Test
    fun removeReportsWhetherItemWasStillQueued() {
        val q = PendingQueue(file())
        q.add(item("a"))
        q.add(item("b"))
        assertTrue(q.remove("a"))
        assertFalse(q.remove("a"))
        assertFalse(q.remove("missing"))
        assertEquals(listOf("b"), PendingQueue(file()).all().map { it.id })
        assertEquals(1, q.count.value)
    }

    @Test
    fun corruptFileIsTreatedAsEmptyAndRecoverable() {
        file().writeText("{not json")
        val q = PendingQueue(file())
        assertTrue(q.all().isEmpty())
        assertTrue(q.add(item("x")))
        assertEquals(listOf("x"), PendingQueue(file()).all().map { it.id })
    }

    @Test
    fun noTempFileLeftBehind() {
        PendingQueue(file()).add(item("a"))
        assertFalse(File(tmp.root, "pending.json.tmp").exists())
    }
}
