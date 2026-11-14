package uk.zowoo.keep.data

enum class UploadAction {
    /** Uploaded (or already on the server): remove from the queue. */
    REMOVE,

    /** Server rejected the item as malformed; retrying will never help. */
    DROP,

    /** Token is invalid: keep the item and stop until the user signs in again. */
    KEEP_SIGNED_OUT,

    /** Transient failure (network, 5xx, 429): keep and retry with backoff. */
    RETRY,
}

/** @param status HTTP status, or null when the request never got a response (network error). */
fun uploadActionFor(status: Int?): UploadAction = when {
    status == null -> UploadAction.RETRY
    status in 200..299 -> UploadAction.REMOVE
    status == 401 -> UploadAction.KEEP_SIGNED_OUT
    status == 429 -> UploadAction.RETRY
    status in 400..499 -> UploadAction.DROP
    else -> UploadAction.RETRY
}
