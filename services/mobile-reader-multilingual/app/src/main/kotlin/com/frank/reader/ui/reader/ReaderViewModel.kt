package com.frank.reader.ui.reader

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.frank.reader.data.SegmentIndexFinder
import com.frank.reader.data.TranscriptsRepository
import com.frank.reader.model.BookSummary
import com.frank.reader.model.ChapterContent
import com.frank.reader.player.PlayerController
import com.frank.reader.player.PlayerSnapshot
import com.frank.reader.prefs.LibraryRoot
import com.frank.reader.prefs.ReaderPreferences
import com.frank.reader.prefs.ReaderSettings
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ReaderUiState(
    val isLoading: Boolean = true,
    val bookTitle: String = "",
    val chapterTitles: List<String> = emptyList(),
    val currentChapterIndex: Int = 0,
    val availableLanguages: List<String> = emptyList(),
    val selectedLanguage: String? = null,
    val segments: List<SegmentUiModel> = emptyList(),
    val activeSegmentIndex: Int = -1,
    val playbackPositionMs: Long = 0,
    val durationMs: Long = 0,
    val bufferedPositionMs: Long = 0,
    val isPlaying: Boolean = false,
    val errorMessage: String? = null,
    val layoutPreference: TranscriptPaneMode? = null
)

data class SegmentUiModel(
    val index: Int,
    val transcriptText: String,
    val translationText: String?,
    val startMs: Long,
    val endMs: Long
)

enum class TranscriptPaneMode {
    Horizontal,
    Vertical,
    SingleOriginal,
    SingleTranslation
}

@HiltViewModel
class ReaderViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: TranscriptsRepository,
    private val preferences: ReaderPreferences,
    private val playerController: PlayerController
) : ViewModel() {

    private val bookId: String = savedStateHandle["bookId"] ?: error("Missing bookId")
    private val initialChapter: Int = savedStateHandle["chapterIndex"] ?: 0

    private val _uiState = MutableStateFlow(ReaderUiState())
    val uiState: StateFlow<ReaderUiState> = _uiState.asStateFlow()

    private val chapterIndex = MutableStateFlow(initialChapter)
    private val languageSelection = MutableStateFlow<String?>(null)
    private val layoutPreference = MutableStateFlow<TranscriptPaneMode?>(null)
    private val bookSummary = MutableStateFlow<BookSummary?>(null)
    private val chapterContent = MutableStateFlow<ChapterContent?>(null)
    private val rootFlow = MutableStateFlow<LibraryRoot?>(null)
    private var lastSettings: ReaderSettings? = null
    private var resumeApplied = false
    private var segmentIndexFinder: SegmentIndexFinder? = null
    private var saveJob: Job? = null
    private var lastPreparedBookId: String? = null
    private var lastPreparedChapterIndex: Int? = null
    private var lastLoggedDurationMs: Long = -1L

    init {
        Log.d(
            "ReaderViewModel",
            "Initializing with bookId=$bookId initialChapter=$initialChapter"
        )
        viewModelScope.launch {
            preferences.settings.collectLatest { settings ->
                lastSettings = settings
                rootFlow.value = settings.root
                if (settings.lastBookId == bookId && !resumeApplied) {
                    chapterIndex.value = settings.lastChapterIndex
                    languageSelection.value = settings.lastLanguage
                }
            }
        }

        viewModelScope.launch {
            rootFlow.filterNotNull().collectLatest { root ->
                val summary = repository.loadBook(root, bookId)
                bookSummary.value = summary
                if (summary != null) {
                    Log.d(
                        "ReaderViewModel",
                        "Book summary loaded id=${summary.id} audio=${summary.audio.uri} chapters=${summary.chapters.size}"
                    )
                    _uiState.update {
                        it.copy(
                            bookTitle = summary.title,
                            chapterTitles = summary.chapters.map { chapter -> chapter.displayName },
                            availableLanguages = summary.availableLanguages.toList().sorted()
                        )
                    }
                } else {
                    Log.w(
                        "ReaderViewModel",
                        "No summary found for bookId=$bookId root=$root"
                    )
                    _uiState.update { it.copy(errorMessage = "Book not found", isLoading = false) }
                }
            }
        }

        viewModelScope.launch {
            combine(
                rootFlow.filterNotNull(),
                bookSummary.filterNotNull(),
                chapterIndex,
                languageSelection
            ) { root, summary, chapterIdx, language ->
                LoadRequest(root, summary, chapterIdx, language)
            }.collectLatest { request ->
                Log.d(
                    "ReaderViewModel",
                    "LoadRequest received root=${request.root} book=${request.summary.id} chapter=${request.chapterIndex} language=${request.language}"
                )
                loadChapter(request)
            }
        }

        viewModelScope.launch {
            playerController.snapshot.collect { snapshot ->
                Log.v(
                    "ReaderViewModel",
                    "Snapshot mediaId=${snapshot.mediaItemId} pos=${snapshot.positionMs} duration=${snapshot.durationMs} playing=${snapshot.isPlaying}"
                )
                applySnapshot(snapshot)
            }
        }

        viewModelScope.launch {
            layoutPreference.collect { preference ->
                _uiState.update { it.copy(layoutPreference = preference) }
            }
        }
    }

    private data class LoadRequest(
        val root: LibraryRoot,
        val summary: BookSummary,
        val chapterIndex: Int,
        val language: String?
    )

    private suspend fun loadChapter(request: LoadRequest) {
        Log.d(
            "ReaderViewModel",
            "Loading chapter index=${request.chapterIndex} language=${request.language} root=${request.root}"
        )
        _uiState.update { it.copy(isLoading = true, currentChapterIndex = request.chapterIndex) }
        val chapter = repository.loadChapter(
            request.root,
            request.summary.id,
            request.chapterIndex,
            request.language
        )
        if (chapter == null) {
            Log.w("ReaderViewModel", "Failed to load chapter index=${request.chapterIndex}")
            _uiState.update { it.copy(isLoading = false, errorMessage = "Unable to load chapter") }
            return
        }
        chapterContent.value = chapter
        segmentIndexFinder = SegmentIndexFinder(chapter.transcript.segments)

        val segmentModels = chapter.transcript.segments.mapIndexed { index, segment ->
            val startMs = (segment.start * 1000).toLong().coerceAtLeast(0L)
            val endMsCandidate = (segment.end * 1000).toLong().coerceAtLeast(0L)
            val endMs = endMsCandidate.coerceAtLeast(startMs)
            SegmentUiModel(
                index = index,
                transcriptText = segment.text.trim(),
                translationText = chapter.alignment.translationTexts.getOrNull(index),
                startMs = startMs,
                endMs = endMs
            )
        }

        _uiState.update {
            it.copy(
                isLoading = false,
                segments = segmentModels,
                selectedLanguage = chapter.alignment.translationLanguage,
                errorMessage = null
            )
        }

        Log.d(
            "ReaderViewModel",
            "Loaded chapter=${request.chapterIndex} segments=${segmentModels.size} translation=${chapter.alignment.translationLanguage}"
        )

        val chapterStartMs = computeChapterStartMs(chapter)
        val shouldResetPosition = lastPreparedBookId != request.summary.id || lastPreparedChapterIndex != request.chapterIndex
        Log.d(
            "ReaderViewModel",
            "Preparing player for chapter=${request.chapterIndex} reset=$shouldResetPosition startMs=$chapterStartMs"
        )
        preparePlayer(
            summary = request.summary,
            chapterIdx = request.chapterIndex,
            chapterStartMs = chapterStartMs,
            resetPosition = shouldResetPosition
        )
    }

    private fun preparePlayer(
        summary: BookSummary,
        chapterIdx: Int,
        chapterStartMs: Long,
        resetPosition: Boolean
    ) {
        val resumePosition = if (!resumeApplied) {
            val settings = lastSettings
            if (settings?.lastBookId == bookId && settings.lastChapterIndex == chapterIdx) {
                resumeApplied = true
                settings.lastPositionMs
            } else null
        } else null

        val targetPosition = resumePosition ?: if (resetPosition) chapterStartMs else null

        val shouldResumePlayback = targetPosition == null && uiState.value.isPlaying

        Log.d(
            "ReaderViewModel",
            "Calling player.prepare mediaId=${summary.id}#${chapterIdx} targetPosition=$targetPosition shouldResume=$shouldResumePlayback"
        )

        playerController.prepare(
            mediaId = "${summary.id}#${chapterIdx}",
            audioSource = summary.audio,
            resumePositionMs = targetPosition,
            playWhenReady = shouldResumePlayback
        )

        if (targetPosition != null) {
            val active = segmentIndexFinder?.findActiveIndex(targetPosition) ?: -1
            _uiState.update {
                it.copy(
                    playbackPositionMs = targetPosition,
                    activeSegmentIndex = active
                )
            }
        }

        lastPreparedBookId = summary.id
        lastPreparedChapterIndex = chapterIdx
    }

    private fun computeChapterStartMs(chapter: ChapterContent): Long {
        val candidates = mutableListOf<Double>()
        val transcriptStart = chapter.transcript.start
        if (transcriptStart.isValidFinite()) {
            candidates.add(transcriptStart)
        }
        chapter.transcript.segments.minOfOrNull { it.start }?.let { segmentStart ->
            if (segmentStart.isValidFinite()) {
                candidates.add(segmentStart)
            }
        }
        val minStartSeconds = candidates.minOrNull() ?: 0.0
        return (minStartSeconds * 1000.0).toLong().coerceAtLeast(0L)
    }

    private fun Double.isValidFinite(): Boolean = !isNaN() && !isInfinite()

    private fun applySnapshot(snapshot: PlayerSnapshot) {
        if (snapshot.durationMs > 0 && snapshot.durationMs != lastLoggedDurationMs) {
            lastLoggedDurationMs = snapshot.durationMs
            Log.d(
                "ReaderViewModel",
                "Player duration reported=${snapshot.durationMs}ms (~${snapshot.durationMs / 1000.0}s)"
            )
        }
        snapshot.error?.let { error ->
            Log.e("ReaderViewModel", "Player error received", error)
        }
        val finder = segmentIndexFinder
        val active = if (finder != null) finder.findActiveIndex(snapshot.positionMs) else -1
        _uiState.update {
            it.copy(
                playbackPositionMs = snapshot.positionMs,
                durationMs = snapshot.durationMs,
                bufferedPositionMs = snapshot.bufferedPositionMs,
                isPlaying = snapshot.isPlaying,
                activeSegmentIndex = active
            )
        }

        saveJob?.cancel()
        saveJob = viewModelScope.launch {
            delay(1500)
            savePlayback(snapshot.positionMs)
        }
    }

    private suspend fun savePlayback(positionMs: Long) {
        preferences.updateLastPlayback(
            bookId = bookId,
            chapterIndex = chapterIndex.value,
            positionMs = positionMs,
            language = languageSelection.value
        )
    }

    fun onTogglePlayPause() {
        Log.d("ReaderViewModel", "onTogglePlayPause")
        playerController.togglePlayPause()
    }

    fun onSeekTo(fraction: Float) {
        val duration = uiState.value.durationMs.takeIf { it > 0 } ?: return
        Log.d(
            "ReaderViewModel",
            "onSeekTo fraction=$fraction duration=$duration"
        )
        playerController.seekTo((duration * fraction.coerceIn(0f, 1f)).toLong())
    }

    fun onSegmentTapped(index: Int) {
        Log.d("ReaderViewModel", "onSegmentTapped index=$index")
        uiState.value.segments.getOrNull(index)?.let { playerController.seekTo(it.startMs) }
    }

    fun onSelectChapter(index: Int) {
        Log.d("ReaderViewModel", "onSelectChapter index=$index")
        chapterIndex.value = index.coerceIn(0, (uiState.value.chapterTitles.lastIndex).coerceAtLeast(0))
    }

    fun onSelectLanguage(language: String?) {
        Log.d("ReaderViewModel", "onSelectLanguage language=$language")
        languageSelection.value = language
    }

    fun onLayoutPreferenceChange(mode: TranscriptPaneMode?) {
        Log.d("ReaderViewModel", "onLayoutPreferenceChange mode=$mode")
        layoutPreference.value = mode
    }

    override fun onCleared() {
        super.onCleared()
        saveJob?.cancel()
    }
}
