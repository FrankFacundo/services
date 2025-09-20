package com.frank.reader.ui.reader

import androidx.activity.ComponentActivity
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.FastRewind
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.SemanticsPropertyKey
import androidx.compose.ui.semantics.SemanticsPropertyReceiver
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.flowWithLifecycle
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlin.math.abs

val SegmentActiveKey = SemanticsPropertyKey<Boolean>("SegmentActive")
var SemanticsPropertyReceiver.segmentActive by SegmentActiveKey

enum class DevicePosture {
    Normal,
    Book,
    Separating
}

@Composable
fun ReaderRoute(
    bookId: String,
    windowSizeClass: WindowSizeClass,
    activity: ComponentActivity,
    onNavigateBack: () -> Unit,
    viewModel: ReaderViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val posture = rememberDevicePosture(activity)

    val derivedPaneMode = remember(uiState.layoutPreference, posture, windowSizeClass) {
        uiState.layoutPreference ?: defaultPaneMode(windowSizeClass.widthSizeClass, posture, uiState.selectedLanguage)
    }

    ReaderScreen(
        state = uiState,
        paneMode = derivedPaneMode,
        onNavigateBack = onNavigateBack,
        onTogglePlayPause = viewModel::onTogglePlayPause,
        onSeekTo = viewModel::onSeekTo,
        onSeekBackward = viewModel::onSeekBackward,
        onSeekForward = viewModel::onSeekForward,
        onSkipAmountSelected = viewModel::onSelectSkipSeconds,
        onPlaybackSpeedSelected = viewModel::onSelectPlaybackSpeed,
        onSelectChapter = viewModel::onSelectChapter,
        onSelectLanguage = viewModel::onSelectLanguage,
        onSegmentTapped = viewModel::onSegmentTapped,
        onLayoutPreferenceChange = viewModel::onLayoutPreferenceChange
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReaderScreen(
    state: ReaderUiState,
    paneMode: TranscriptPaneMode,
    onNavigateBack: () -> Unit,
    onTogglePlayPause: () -> Unit,
    onSeekTo: (Float) -> Unit,
    onSeekBackward: () -> Unit,
    onSeekForward: () -> Unit,
    onSkipAmountSelected: (Int) -> Unit,
    onPlaybackSpeedSelected: (Float) -> Unit,
    onSelectChapter: (Int) -> Unit,
    onSelectLanguage: (String?) -> Unit,
    onSegmentTapped: (Int) -> Unit,
    onLayoutPreferenceChange: (TranscriptPaneMode?) -> Unit
) {
    val originalListState = rememberLazyListState()
    val translationListState = rememberLazyListState()

    LaunchedEffect(paneMode) {
        if (paneMode == TranscriptPaneMode.SingleTranslation && state.selectedLanguage == null) {
            onLayoutPreferenceChange(TranscriptPaneMode.SingleOriginal)
        }
    }

    SegmentAutoScroller(
        listState = originalListState,
        activeIndex = state.activeSegmentIndex,
        throttleMs = 250
    )

    if (paneMode != TranscriptPaneMode.SingleOriginal) {
        SegmentAutoScroller(
            listState = translationListState,
            activeIndex = state.activeSegmentIndex,
            throttleMs = 250
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.bookTitle) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            HeaderControls(
                state = state,
                onSelectChapter = onSelectChapter,
                onSelectLanguage = onSelectLanguage,
                onLayoutPreferenceChange = onLayoutPreferenceChange,
                paneMode = paneMode
            )

            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                when {
                    state.isLoading -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("Loading chapter…", textAlign = TextAlign.Center)
                        }
                    }

                    state.segments.isEmpty() -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No transcript for this chapter.", textAlign = TextAlign.Center)
                        }
                    }

                    else -> {
                        TranscriptPane(
                            state = state,
                            paneMode = paneMode,
                            originalListState = originalListState,
                            translationListState = translationListState,
                            onSegmentTapped = onSegmentTapped
                        )
                    }
                }
            }

            PlaybackControls(
                isPlaying = state.isPlaying,
                positionMs = state.playbackPositionMs,
                durationMs = state.durationMs,
                selectedSkipSeconds = state.selectedSkipSeconds,
                skipOptionsSeconds = state.skipOptionsSeconds,
                playbackSpeed = state.playbackSpeed,
                playbackSpeedOptions = state.playbackSpeedOptions,
                onTogglePlayPause = onTogglePlayPause,
                onSeekTo = onSeekTo,
                onSeekBackward = onSeekBackward,
                onSeekForward = onSeekForward,
                onSkipAmountSelected = onSkipAmountSelected,
                onPlaybackSpeedSelected = onPlaybackSpeedSelected
            )
        }
    }
}

@Composable
private fun HeaderControls(
    state: ReaderUiState,
    onSelectChapter: (Int) -> Unit,
    onSelectLanguage: (String?) -> Unit,
    onLayoutPreferenceChange: (TranscriptPaneMode?) -> Unit,
    paneMode: TranscriptPaneMode
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            ChapterSelector(
                chapterTitles = state.chapterTitles,
                currentIndex = state.currentChapterIndex,
                onSelect = onSelectChapter
            )
            LanguageSelector(
                languages = state.availableLanguages,
                selectedLanguage = state.selectedLanguage,
                onLanguageSelected = onSelectLanguage
            )
        }

        LayoutSelector(
            paneMode = paneMode,
            translationAvailable = state.selectedLanguage != null,
            onLayoutPreferenceChange = onLayoutPreferenceChange
        )
        Spacer(modifier = Modifier.height(4.dp))
    }
}

@Composable
private fun TranscriptPane(
    state: ReaderUiState,
    paneMode: TranscriptPaneMode,
    originalListState: androidx.compose.foundation.lazy.LazyListState,
    translationListState: androidx.compose.foundation.lazy.LazyListState,
    onSegmentTapped: (Int) -> Unit
) {
    val activeIndex = state.activeSegmentIndex
    val showTranslation = paneMode != TranscriptPaneMode.SingleOriginal && state.selectedLanguage != null

    when (paneMode) {
        TranscriptPaneMode.Horizontal -> {
            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                TranscriptColumn(
                    modifier = Modifier.weight(1f),
                    title = "Original",
                    listState = originalListState,
                    segments = state.segments,
                    activeIndex = activeIndex,
                    isTranslation = false,
                    onSegmentTapped = onSegmentTapped
                )
                if (showTranslation) {
                    TranscriptColumn(
                        modifier = Modifier.weight(1f),
                        title = state.selectedLanguage?.uppercase() ?: "Translation",
                        listState = translationListState,
                        segments = state.segments,
                        activeIndex = activeIndex,
                        isTranslation = true,
                        onSegmentTapped = onSegmentTapped
                    )
                }
            }
        }

        TranscriptPaneMode.Vertical -> {
            Column(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                TranscriptColumn(
                    modifier = Modifier.weight(1f),
                    title = "Original",
                    listState = originalListState,
                    segments = state.segments,
                    activeIndex = activeIndex,
                    isTranslation = false,
                    onSegmentTapped = onSegmentTapped
                )
                if (showTranslation) {
                    TranscriptColumn(
                        modifier = Modifier.weight(1f),
                        title = state.selectedLanguage?.uppercase() ?: "Translation",
                        listState = translationListState,
                        segments = state.segments,
                        activeIndex = activeIndex,
                        isTranslation = true,
                        onSegmentTapped = onSegmentTapped
                    )
                }
            }
        }

        TranscriptPaneMode.SingleOriginal -> {
            TranscriptColumn(
                modifier = Modifier.fillMaxSize(),
                title = "Original",
                listState = originalListState,
                segments = state.segments,
                activeIndex = activeIndex,
                isTranslation = false,
                onSegmentTapped = onSegmentTapped
            )
        }

        TranscriptPaneMode.SingleTranslation -> {
            if (showTranslation) {
                TranscriptColumn(
                    modifier = Modifier.fillMaxSize(),
                    title = state.selectedLanguage?.uppercase() ?: "Translation",
                    listState = translationListState,
                    segments = state.segments,
                    activeIndex = activeIndex,
                    isTranslation = true,
                    onSegmentTapped = onSegmentTapped
                )
            } else {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Translation unavailable")
                }
            }
        }
    }
}

@Composable
private fun TranscriptColumn(
    modifier: Modifier,
    title: String,
    listState: androidx.compose.foundation.lazy.LazyListState,
    segments: List<SegmentUiModel>,
    activeIndex: Int,
    isTranslation: Boolean,
    onSegmentTapped: (Int) -> Unit
) {
    Column(modifier = modifier.fillMaxSize()) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f)),
            state = listState,
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            items(segments, key = { it.index }) { segment ->
                val tag = if (isTranslation) "translationSegment_${segment.index}" else "originalSegment_${segment.index}"
                SegmentRow(
                    segment = segment,
                    isActive = segment.index == activeIndex,
                    showTranslation = isTranslation,
                    modifier = Modifier.testTag(tag),
                    onClick = { onSegmentTapped(segment.index) }
                )
            }
        }
    }
}

@Composable
private fun SegmentRow(
    segment: SegmentUiModel,
    isActive: Boolean,
    showTranslation: Boolean,
    modifier: Modifier,
    onClick: () -> Unit
) {
    val baseColor = if (showTranslation) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.primaryContainer
    val highlightColor by animateColorAsState(
        targetValue = if (isActive) baseColor else MaterialTheme.colorScheme.surface,
        label = "segmentHighlight"
    )
    ElevatedCard(
        modifier = modifier
            .fillMaxWidth()
            .semantics { segmentActive = isActive },
        onClick = onClick
    ) {
        Column(
            modifier = Modifier
                .background(highlightColor)
                .padding(horizontal = 12.dp, vertical = 10.dp)
        ) {
            val text = if (showTranslation) segment.translationText ?: "—" else segment.transcriptText
            Text(
                text = text,
                style = if (isActive) MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold) else MaterialTheme.typography.bodyLarge
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PlaybackControls(
    isPlaying: Boolean,
    positionMs: Long,
    durationMs: Long,
    selectedSkipSeconds: Int,
    skipOptionsSeconds: List<Int>,
    playbackSpeed: Float,
    playbackSpeedOptions: List<Float>,
    onTogglePlayPause: () -> Unit,
    onSeekTo: (Float) -> Unit,
    onSeekBackward: () -> Unit,
    onSeekForward: () -> Unit,
    onSkipAmountSelected: (Int) -> Unit,
    onPlaybackSpeedSelected: (Float) -> Unit
) {
    val duration = if (durationMs > 0) durationMs else 1L
    var sliderPosition by remember { mutableFloatStateOf(0f) }
    var isDragging by remember { mutableStateOf(false) }
    val positionFraction = (positionMs.toFloat() / duration).coerceIn(0f, 1f)
    LaunchedEffect(positionFraction, durationMs) {
        if (!isDragging) {
            sliderPosition = positionFraction
        }
    }

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterHorizontally)
        ) {
            SkipControlButton(
                modifier = Modifier,
                label = "-${selectedSkipSeconds}s",
                contentDescription = "Skip backward $selectedSkipSeconds seconds",
                icon = Icons.Filled.FastRewind,
                skipOptions = skipOptionsSeconds,
                selectedSkipSeconds = selectedSkipSeconds,
                onSkip = onSeekBackward,
                onSkipOptionSelected = onSkipAmountSelected
            )
            IconButton(onClick = onTogglePlayPause) {
                Icon(
                    imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                    contentDescription = if (isPlaying) "Pause" else "Play"
                )
            }
            SkipControlButton(
                modifier = Modifier,
                label = "+${selectedSkipSeconds}s",
                contentDescription = "Skip forward $selectedSkipSeconds seconds",
                icon = Icons.Filled.FastForward,
                skipOptions = skipOptionsSeconds,
                selectedSkipSeconds = selectedSkipSeconds,
                onSkip = onSeekForward,
                onSkipOptionSelected = onSkipAmountSelected
            )
        }

        Column {
            Slider(
                value = sliderPosition,
                onValueChange = {
                    sliderPosition = it
                    isDragging = true
                },
                onValueChangeFinished = {
                    onSeekTo(sliderPosition)
                    isDragging = false
                }
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(formatTime(positionMs), style = MaterialTheme.typography.labelSmall)
                Text(formatTime(durationMs), style = MaterialTheme.typography.labelSmall)
            }
        }

        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            playbackSpeedOptions.forEachIndexed { index, speed ->
                SegmentedButton(
                    selected = speed == playbackSpeed,
                    onClick = { onPlaybackSpeedSelected(speed) },
                    shape = SegmentedButtonDefaults.itemShape(index, playbackSpeedOptions.size)
                ) {
                    Text(speed.formatSpeedLabel())
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun SkipControlButton(
    modifier: Modifier = Modifier,
    label: String,
    contentDescription: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    skipOptions: List<Int>,
    selectedSkipSeconds: Int,
    onSkip: () -> Unit,
    onSkipOptionSelected: (Int) -> Unit
) {
    var menuExpanded by remember { mutableStateOf(false) }
    Box(modifier = modifier) {
        Surface(
            modifier = Modifier
                .combinedClickable(
                    role = Role.Button,
                    onClick = onSkip,
                    onLongClick = { menuExpanded = true }
                )
                .semantics { this.contentDescription = contentDescription },
            shape = MaterialTheme.shapes.small,
            color = MaterialTheme.colorScheme.secondaryContainer,
            contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
            tonalElevation = 2.dp
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(imageVector = icon, contentDescription = null)
                Text(text = label, style = MaterialTheme.typography.labelLarge)
                Icon(imageVector = Icons.Filled.ExpandMore, contentDescription = null)
            }
        }
        DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
            skipOptions.forEach { seconds ->
                DropdownMenuItem(
                    text = { Text("$seconds seconds") },
                    trailingIcon = if (seconds == selectedSkipSeconds) {
                        { Icon(imageVector = Icons.Filled.Check, contentDescription = null) }
                    } else null,
                    onClick = {
                        onSkipOptionSelected(seconds)
                        menuExpanded = false
                    }
                )
            }
        }
    }
}

@Composable
private fun ChapterSelector(
    chapterTitles: List<String>,
    currentIndex: Int,
    onSelect: (Int) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val currentTitle = chapterTitles.getOrNull(currentIndex) ?: "Chapter ${currentIndex + 1}"
    Box {
        AssistChip(
            onClick = { expanded = true },
            label = { Text(currentTitle) },
            colors = AssistChipDefaults.assistChipColors()
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            chapterTitles.forEachIndexed { index, title ->
                DropdownMenuItem(
                    text = { Text(title) },
                    onClick = {
                        expanded = false
                        onSelect(index)
                    }
                )
            }
        }
    }
}

@Composable
private fun LanguageSelector(
    languages: List<String>,
    selectedLanguage: String?,
    onLanguageSelected: (String?) -> Unit
) {
    if (languages.isEmpty()) {
        Text("No translation", style = MaterialTheme.typography.labelMedium)
        return
    }
    var expanded by remember { mutableStateOf(false) }
    val label = selectedLanguage?.uppercase() ?: "Auto"
    Box {
        AssistChip(
            onClick = { expanded = true },
            label = { Text("Lang: $label") }
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(text = { Text("Auto") }, onClick = {
                expanded = false
                onLanguageSelected(null)
            })
            languages.forEach { language ->
                DropdownMenuItem(
                    text = { Text(language.uppercase()) },
                    onClick = {
                        expanded = false
                        onLanguageSelected(language)
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LayoutSelector(
    paneMode: TranscriptPaneMode,
    translationAvailable: Boolean,
    onLayoutPreferenceChange: (TranscriptPaneMode?) -> Unit
) {
    val options = buildList {
        add(TranscriptPaneMode.Horizontal)
        add(TranscriptPaneMode.Vertical)
        add(TranscriptPaneMode.SingleOriginal)
        if (translationAvailable) add(TranscriptPaneMode.SingleTranslation)
    }
    SingleChoiceSegmentedButtonRow {
        options.forEachIndexed { index, mode ->
            val selected = paneMode == mode
            SegmentedButton(
                selected = selected,
                onClick = { onLayoutPreferenceChange(mode) },
                shape = SegmentedButtonDefaults.itemShape(index, options.size)
            ) {
                Text(mode.toLabel())
            }
        }
    }
}

private fun TranscriptPaneMode.toLabel(): String = when (this) {
    TranscriptPaneMode.Horizontal -> "Side"
    TranscriptPaneMode.Vertical -> "Stack"
    TranscriptPaneMode.SingleOriginal -> "Original"
    TranscriptPaneMode.SingleTranslation -> "Trans"
}

private fun Float.formatSpeedLabel(): String {
    val isWhole = abs(this - this.toInt()) < 0.001f
    val numeric = if (isWhole) {
        this.toInt().toString()
    } else {
        String.format(Locale.US, "%.2f", this).trimEnd('0').trimEnd('.')
    }
    return numeric + "x"
}

private fun formatTime(positionMs: Long): String {
    val totalSeconds = positionMs / 1000
    val minutes = TimeUnit.SECONDS.toMinutes(totalSeconds)
    val seconds = totalSeconds % 60
    return "%02d:%02d".format(minutes, seconds)
}

@Composable
private fun rememberDevicePosture(activity: ComponentActivity): DevicePosture {
    val lifecycleOwner = LocalLifecycleOwner.current
    val tracker = remember(activity) { WindowInfoTracker.getOrCreate(activity) }
    val windowLayoutInfoFlow = remember(activity) { tracker.windowLayoutInfo(activity) }
    val postureState = remember { mutableStateOf(DevicePosture.Normal) }

    LaunchedEffect(windowLayoutInfoFlow, lifecycleOwner) {
        windowLayoutInfoFlow
            .flowWithLifecycle(lifecycleOwner.lifecycle)
            .collect { layoutInfo ->
                postureState.value = layoutInfo.toDevicePosture()
            }
    }

    return postureState.value
}

private fun WindowLayoutInfo.toDevicePosture(): DevicePosture {
    val foldingFeature = displayFeatures.filterIsInstance<FoldingFeature>().firstOrNull()
    return when {
        foldingFeature == null -> DevicePosture.Normal
        foldingFeature.state == FoldingFeature.State.HALF_OPENED -> DevicePosture.Book
        foldingFeature.isSeparating -> DevicePosture.Separating
        else -> DevicePosture.Normal
    }
}

private fun defaultPaneMode(
    widthSizeClass: WindowWidthSizeClass,
    posture: DevicePosture,
    selectedLanguage: String?
): TranscriptPaneMode = when {
    posture == DevicePosture.Separating || posture == DevicePosture.Book -> TranscriptPaneMode.Horizontal
    widthSizeClass == WindowWidthSizeClass.Expanded -> TranscriptPaneMode.Horizontal
    widthSizeClass == WindowWidthSizeClass.Medium -> TranscriptPaneMode.Vertical
    selectedLanguage == null -> TranscriptPaneMode.SingleOriginal
    else -> TranscriptPaneMode.Vertical
}
