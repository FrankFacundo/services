package com.frank.reader.ui.reader

import android.os.SystemClock
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first

@Composable
fun SegmentAutoScroller(
    listState: LazyListState,
    activeIndex: Int,
    throttleMs: Long
) {
    var lastScrollTimestamp by remember { mutableStateOf(0L) }

    LaunchedEffect(listState) {
        snapshotFlow { listState.isScrollInProgress }.collect { scrolling ->
            if (scrolling) {
                lastScrollTimestamp = SystemClock.elapsedRealtime()
            }
        }
    }

    LaunchedEffect(activeIndex) {
        if (activeIndex < 0 || listState.layoutInfo.totalItemsCount == 0) return@LaunchedEffect
        if (listState.isScrollInProgress) {
            snapshotFlow { listState.isScrollInProgress }
                .filter { !it }
                .first()
        }
        val now = SystemClock.elapsedRealtime()
        val elapsed = now - lastScrollTimestamp
        if (elapsed < throttleMs) {
            delay(throttleMs - elapsed)
        }
        val viewport = listState.layoutInfo.viewportEndOffset - listState.layoutInfo.viewportStartOffset
        val scrollOffset = if (viewport > 0) -viewport / 3 else 0
        listState.animateScrollToItem(activeIndex, scrollOffset)
        lastScrollTimestamp = SystemClock.elapsedRealtime()
    }
}
