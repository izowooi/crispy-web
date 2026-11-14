package uk.zowoo.keep

import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.net.toUri
import uk.zowoo.keep.auth.Pkce
import uk.zowoo.keep.ui.MainScreen
import uk.zowoo.keep.ui.ZKeepTheme

class MainActivity : ComponentActivity() {
    private val vm: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        // On recreation the launching intent is the same one; handling it again would re-redeem a spent code.
        if (savedInstanceState == null) handleIntent(intent)
        setContent {
            ZKeepTheme {
                MainScreen(vm = vm, onSignIn = ::startSignIn, openUrl = ::openUrl)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        intent ?: return
        val data = intent.data
        if (data != null && data.scheme == "zkeep" && data.host == "auth") {
            val code = data.getQueryParameter("code")
            if (!code.isNullOrBlank()) vm.completeSignIn(code) else vm.signInFailed(data.getQueryParameter("error"))
            return
        }
        if (intent.getBooleanExtra(EXTRA_START_SIGN_IN, false) && zkeep.auth.token == null) startSignIn()
    }

    private fun startSignIn() {
        val verifier = Pkce.newVerifier()
        zkeep.auth.verifier = verifier
        val url = BuildConfig.BASE_URL.toUri().buildUpon()
            .appendEncodedPath("auth/app/start")
            .appendQueryParameter("challenge", Pkce.challenge(verifier))
            .appendQueryParameter("device", Build.MODEL)
            .build()
            .toString()
        openUrl(url)
    }

    private fun openUrl(url: String) {
        val uri = url.toUri()
        try {
            CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(this, uri)
        } catch (_: ActivityNotFoundException) {
            runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
        }
    }

    companion object {
        const val EXTRA_START_SIGN_IN = "uk.zowoo.keep.START_SIGN_IN"
    }
}
