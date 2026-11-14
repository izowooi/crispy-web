package uk.zowoo.keep.work

import android.content.Context
import android.os.Build
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import uk.zowoo.keep.data.UploadAction
import uk.zowoo.keep.data.uploadActionFor
import uk.zowoo.keep.zkeep
import java.io.IOException
import java.util.concurrent.TimeUnit

class UploadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val app = applicationContext.zkeep
        if (app.auth.token == null) return@withContext Result.success()

        // Re-read the queue each step so items shared while this worker runs are drained too.
        val attempted = HashSet<String>()
        while (true) {
            val item = app.queue.all().firstOrNull { it.id !in attempted } ?: break
            attempted += item.id
            val status = try {
                app.api.createBookmark(item)
            } catch (_: IOException) {
                null
            }
            when (uploadActionFor(status)) {
                UploadAction.REMOVE -> {
                    // remove() == false means the user hit "실행취소" while the upload was in flight.
                    if (!app.queue.remove(item.id)) runCatching { app.api.delete(item.id) }
                }
                UploadAction.DROP -> app.queue.remove(item.id)
                UploadAction.KEEP_SIGNED_OUT -> return@withContext Result.success()
                UploadAction.RETRY -> return@withContext Result.retry()
            }
        }
        Result.success()
    }

    companion object {
        private const val UNIQUE_NAME = "upload-pending"

        fun enqueue(context: Context) {
            val request = OneTimeWorkRequestBuilder<UploadWorker>()
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
                .apply {
                    // Below API 31 expedited work runs as a foreground service (needs a notification and
                    // getForegroundInfo); not worth it there, plain work starts almost as quickly.
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                    }
                }
                .build()
            WorkManager.getInstance(context)
                .enqueueUniqueWork(UNIQUE_NAME, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
        }
    }
}
