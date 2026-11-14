package uk.zowoo.keep.data

import java.io.File

/** First page of the default (all, no query) list, so launch can render immediately before the network answers. */
class BookmarkCache(private val file: File) {

    fun load(): BookmarkPage? = synchronized(this) {
        if (!file.isFile) return null
        runCatching { ApiJson.parsePage(file.readText()) }.getOrNull()
    }

    fun save(page: BookmarkPage) = synchronized(this) {
        val tmp = File(file.parentFile, file.name + ".tmp")
        tmp.writeText(ApiJson.pageToJson(page))
        if (!tmp.renameTo(file)) tmp.delete()
    }

    fun clear() = synchronized(this) { file.delete() }
}
