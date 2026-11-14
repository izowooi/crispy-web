package uk.zowoo.keep

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import uk.zowoo.keep.auth.Pkce

class PkceTest {

    @Test
    fun challenge_matchesRfc7636AppendixB() {
        val verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        assertEquals("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", Pkce.challenge(verifier))
    }

    @Test
    fun verifier_is43UrlSafeCharsWithoutPadding() {
        val v = Pkce.newVerifier()
        assertEquals(43, v.length)
        assertTrue(v.all { it.isLetterOrDigit() || it == '-' || it == '_' })
        assertFalse(v.contains('='))
        assertNotEquals(v, Pkce.newVerifier())
    }
}
