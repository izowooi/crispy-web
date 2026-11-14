package uk.zowoo.keep

import android.app.Application
import android.content.Context
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.network.okhttp.OkHttpNetworkFetcherFactory
import coil3.request.crossfade
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import uk.zowoo.keep.auth.AuthStore
import uk.zowoo.keep.data.Api
import uk.zowoo.keep.data.BookmarkCache
import uk.zowoo.keep.data.PendingQueue
import uk.zowoo.keep.share.Shortcuts
import java.io.File
import java.util.concurrent.TimeUnit

/** Manual service locator. Everything is lazy so cold start (especially the share sheet) pays only for what it touches. */
class ZKeepApp : Application(), SingletonImageLoader.Factory {

    /** Outlives activities: queue writes and undo calls must finish even after ShareActivity is gone. */
    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    val http: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .build()
    }
    val auth: AuthStore by lazy { AuthStore(this) }
    val queue: PendingQueue by lazy { PendingQueue(File(filesDir, "pending.json")) }
    val cache: BookmarkCache by lazy { BookmarkCache(File(filesDir, "bookmarks_cache.json")) }
    val api: Api by lazy { Api(http, BuildConfig.BASE_URL, auth) }

    override fun onCreate() {
        super.onCreate()
        appScope.launch { Shortcuts.publish(this@ZKeepApp) }
    }

    override fun newImageLoader(context: PlatformContext): ImageLoader =
        ImageLoader.Builder(context)
            .components { add(OkHttpNetworkFetcherFactory(callFactory = { http })) }
            .crossfade(true)
            .build()
}

val Context.zkeep: ZKeepApp get() = applicationContext as ZKeepApp
