package uk.zowoo.keep.ui

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import uk.zowoo.keep.R
import uk.zowoo.keep.data.Bookmark

class CardActions(
    val open: (Bookmark) -> Unit,
    val toggleRead: (Bookmark) -> Unit,
    val copy: (Bookmark) -> Unit,
    val share: (Bookmark) -> Unit,
    val delete: (Bookmark) -> Unit,
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun BookmarkCard(bookmark: Bookmark, actions: CardActions, modifier: Modifier = Modifier) {
    var menuOpen by remember { mutableStateOf(false) }
    val unread = !bookmark.isRead
    val colors = if (unread) {
        CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh)
    } else {
        CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
    }
    val title = bookmark.title.ifBlank { bookmark.url ?: bookmark.note.lineSequence().firstOrNull().orEmpty() }

    Card(
        colors = colors,
        modifier = modifier
            .fillMaxWidth()
            .clip(CardDefaults.shape)
            .combinedClickable(
                onClick = { actions.open(bookmark) },
                onLongClick = { menuOpen = true },
            ),
    ) {
        Column(Modifier.alpha(if (unread) 1f else 0.62f)) {
            Row(Modifier.padding(start = 16.dp, top = 12.dp), verticalAlignment = Alignment.Top) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = if (unread) FontWeight.SemiBold else FontWeight.Normal,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f).padding(top = 4.dp),
                )
                Box {
                    IconButton(onClick = { menuOpen = true }, modifier = Modifier.size(40.dp)) {
                        Icon(Icons.Filled.MoreVert, contentDescription = stringResource(R.string.more))
                    }
                    CardMenu(bookmark, expanded = menuOpen, onDismiss = { menuOpen = false }, actions = actions)
                }
            }
            if (bookmark.note.isNotBlank() && bookmark.note != title) {
                Text(
                    bookmark.note,
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 8,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                )
            }
            if (bookmark.url != null && bookmark.url != title) {
                Text(
                    bookmark.url,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp),
                )
            }
            Spacer(Modifier.height(10.dp))
            FooterStrip(bookmark)
        }
    }
}

@Composable
private fun FooterStrip(bookmark: Bookmark) {
    val label = bookmark.siteName.ifBlank { bookmark.domain }
    if (label.isBlank() && bookmark.image == null && bookmark.favicon == null) {
        Spacer(Modifier.height(4.dp))
        return
    }
    Row(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        when {
            bookmark.image != null -> AsyncImage(
                model = bookmark.image,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(44.dp).clip(RoundedCornerShape(6.dp)),
            )
            bookmark.favicon != null -> AsyncImage(
                model = bookmark.favicon,
                contentDescription = null,
                modifier = Modifier.size(18.dp).clip(RoundedCornerShape(3.dp)),
            )
        }
        if (bookmark.image != null || bookmark.favicon != null) Spacer(Modifier.width(10.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun CardMenu(bookmark: Bookmark, expanded: Boolean, onDismiss: () -> Unit, actions: CardActions) {
    DropdownMenu(expanded = expanded, onDismissRequest = onDismiss) {
        DropdownMenuItem(
            text = { Text(stringResource(if (bookmark.isRead) R.string.mark_unread else R.string.mark_read)) },
            onClick = { onDismiss(); actions.toggleRead(bookmark) },
        )
        if (bookmark.url != null) {
            DropdownMenuItem(
                text = { Text(stringResource(R.string.copy_link)) },
                onClick = { onDismiss(); actions.copy(bookmark) },
            )
        }
        DropdownMenuItem(
            text = { Text(stringResource(R.string.share)) },
            onClick = { onDismiss(); actions.share(bookmark) },
        )
        DropdownMenuItem(
            text = { Text(stringResource(R.string.delete), color = MaterialTheme.colorScheme.error) },
            onClick = { onDismiss(); actions.delete(bookmark) },
        )
    }
}
