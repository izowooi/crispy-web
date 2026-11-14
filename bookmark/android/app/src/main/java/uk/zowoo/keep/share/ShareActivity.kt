package uk.zowoo.keep.share

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Button
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import uk.zowoo.keep.MainActivity
import uk.zowoo.keep.R
import uk.zowoo.keep.data.ApiJson
import uk.zowoo.keep.data.PendingItem
import uk.zowoo.keep.data.SharedText
import uk.zowoo.keep.ui.ZKeepTheme
import uk.zowoo.keep.work.UploadWorker
import uk.zowoo.keep.zkeep
import java.util.UUID

/** Translucent overlay over the sharing app: queue first, then show a brief confirmation. No tap required. */
class ShareActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        val text = intent.getStringExtra(Intent.EXTRA_TEXT)?.trim().orEmpty()
        if (intent.action != Intent.ACTION_SEND || text.isEmpty()) {
            Toast.makeText(this, R.string.share_nothing, Toast.LENGTH_SHORT).show()
            finish()
            return
        }
        val subject = intent.getStringExtra(Intent.EXTRA_SUBJECT)?.trim()?.takeIf { it.isNotEmpty() }
        // Reuse the id across recreation so a rotation can't enqueue the same share twice.
        val id = savedInstanceState?.getString(KEY_ID) ?: UUID.randomUUID().toString()
        intent.putExtra(KEY_ID, id)

        val app = zkeep
        val signedIn = app.auth.token != null
        val item = PendingItem(id, text, subject, System.currentTimeMillis())
        val enqueueJob = app.appScope.launch {
            app.queue.add(item)
            if (signedIn) UploadWorker.enqueue(app)
        }

        val url = SharedText.firstUrl(text)
        val displayTitle = subject ?: text.lineSequence().first().take(200)
        val domain = ApiJson.hostOf(url).orEmpty()

        setContent {
            ZKeepTheme {
                ShareOverlay(
                    title = displayTitle,
                    domain = domain,
                    signedIn = signedIn,
                    onDismiss = ::finish,
                    onUndo = {
                        app.appScope.launch {
                            enqueueJob.join()
                            if (!app.queue.remove(id)) runCatching { app.api.delete(id) }
                        }
                    },
                    onSignIn = {
                        startActivity(
                            Intent(this, MainActivity::class.java)
                                .putExtra(MainActivity.EXTRA_START_SIGN_IN, true)
                                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        )
                        finish()
                    },
                )
            }
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(KEY_ID, intent.getStringExtra(KEY_ID))
    }

    override fun finish() {
        super.finish()
        @Suppress("DEPRECATION")
        overridePendingTransition(0, android.R.anim.fade_out)
    }

    private companion object {
        const val KEY_ID = "uk.zowoo.keep.share_id"
    }
}

@Composable
private fun ShareOverlay(
    title: String,
    domain: String,
    signedIn: Boolean,
    onDismiss: () -> Unit,
    onUndo: () -> Unit,
    onSignIn: () -> Unit,
) {
    var undone by remember { mutableStateOf(false) }

    LaunchedEffect(signedIn, undone) {
        when {
            undone -> { delay(700); onDismiss() }
            signedIn -> { delay(1500); onDismiss() }
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.12f))
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onDismiss)
            .navigationBarsPadding()
            .padding(16.dp),
        contentAlignment = Alignment.BottomCenter,
    ) {
        ElevatedCard(
            Modifier
                .widthIn(max = 480.dp)
                .fillMaxWidth()
                // Swallow taps on the card itself so only the scrim dismisses.
                .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {},
        ) {
            Column(Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = if (signedIn && !undone) Icons.Filled.CheckCircle else Icons.Filled.Info,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(22.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = stringResource(
                            when {
                                undone -> R.string.share_undone
                                signedIn -> R.string.share_saved
                                else -> R.string.share_need_login
                            }
                        ),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    if (!undone) {
                        TextButton(onClick = { undone = true; onUndo() }) { Text(stringResource(R.string.action_undo)) }
                    }
                }
                Spacer(Modifier.size(4.dp))
                Text(title, style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                if (domain.isNotEmpty()) {
                    Text(
                        domain,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                    )
                }
                if (!signedIn && !undone) {
                    Spacer(Modifier.size(12.dp))
                    Text(
                        stringResource(R.string.share_need_login_detail),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.size(8.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        Button(onClick = onSignIn) { Text(stringResource(R.string.sign_in_google)) }
                    }
                }
            }
        }
    }
}
