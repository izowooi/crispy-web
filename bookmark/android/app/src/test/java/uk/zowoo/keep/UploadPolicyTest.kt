package uk.zowoo.keep

import org.junit.Assert.assertEquals
import org.junit.Test
import uk.zowoo.keep.data.UploadAction
import uk.zowoo.keep.data.uploadActionFor

class UploadPolicyTest {

    @Test
    fun successRemovesFromQueue() {
        assertEquals(UploadAction.REMOVE, uploadActionFor(200))
        assertEquals(UploadAction.REMOVE, uploadActionFor(201))
    }

    @Test
    fun unauthorizedKeepsItemAndStops() {
        assertEquals(UploadAction.KEEP_SIGNED_OUT, uploadActionFor(401))
    }

    @Test
    fun otherClientErrorsDropTheItem() {
        listOf(400, 403, 404, 409, 413, 422).forEach { assertEquals("$it", UploadAction.DROP, uploadActionFor(it)) }
    }

    @Test
    fun rateLimitServerErrorsAndNetworkFailuresRetry() {
        assertEquals(UploadAction.RETRY, uploadActionFor(429))
        listOf(500, 502, 503, 504).forEach { assertEquals("$it", UploadAction.RETRY, uploadActionFor(it)) }
        assertEquals(UploadAction.RETRY, uploadActionFor(null))
    }
}
