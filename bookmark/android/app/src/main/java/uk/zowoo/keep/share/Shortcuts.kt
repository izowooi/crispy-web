package uk.zowoo.keep.share

import android.content.Context
import android.content.Intent
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import uk.zowoo.keep.MainActivity
import uk.zowoo.keep.R

object Shortcuts {
    /** Must match the category in res/xml/shortcuts.xml. */
    private const val SHARE_CATEGORY = "uk.zowoo.keep.category.SHARE_TARGET"
    private const val SHARE_ID = "save"

    /** Direct Share row entry (API 29+ reads share-target shortcuts natively). */
    fun publish(context: Context) {
        runCatching {
            if (ShortcutManagerCompat.getDynamicShortcuts(context).any { it.id == SHARE_ID }) return
            val shortcut = ShortcutInfoCompat.Builder(context, SHARE_ID)
                .setShortLabel(context.getString(R.string.shortcut_save_short))
                .setLongLabel(context.getString(R.string.shortcut_save_long))
                .setIcon(IconCompat.createWithResource(context, R.mipmap.ic_launcher))
                .setIntent(Intent(context, MainActivity::class.java).setAction(Intent.ACTION_VIEW))
                .setCategories(setOf(SHARE_CATEGORY))
                .setLongLived(true)
                .build()
            ShortcutManagerCompat.pushDynamicShortcut(context, shortcut)
        }
    }
}
