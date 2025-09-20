package com.frank.reader.ui.reader

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

    init {
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
                    _uiState.update {
                        it.copy(
                            bookTitle = summary.title,
                            chapterTitles = summary.chapters.map { chapter -> chapter.displayName },
                            availableLanguages = summary.availableLanguages.toList().sorted()
                        )
                    }
                } else {
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
                loadChapter(request)
            }
        }

        viewModelScope.launch {
            playerController.snapshot.collect { snapshot ->
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
        _uiState.update { it.copy(isLoading = true, currentChapterIndex = request.chapterIndex) }
        val chapter = repository.loadChapter(
            request.root,
            request.summary.id,
            request.chapterIndex,
            request.language
        )
        if (chapter == null) {
            _uiState.update { it.copy(isLoading = false, errorMessage = "Unable to load chapter") }
            return
        }
        chapterContent.value = chapter
        segmentIndexFinder = SegmentIndexFinder(chapter.transcript.segments)

        val segmentModels = chapter.transcript.segments.mapIndexed { index, segment ->
            SegmentUiModel(
                index = index,
                transcriptText = segment.text.trim(),
                translationText = chapter.alignment.translationTexts.getOrNull(index),
                startMs = (segment.start * 1000).toLong(),
                endMs = (segment.end * 1000).toLong()
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

        preparePlayer(request.summary, request.chapterIndex)
        val lastPosition = lastSettings?.takeIf { it.lastBookId == bookId && it.lastChapterIndex == request.chapterIndex }?.lastPositionMs ?: 0L
        if (lastPosition > 0 && !resumeApplied) {
            _uiState.update { it.copy(playbackPositionMs = lastPosition) }
        }
    }

    private fun preparePlayer(summary: BookSummary, chapterIdx: Int) {
        val resumePosition = if (!resumeApplied) {
            val settings = lastSettings
            if (settings?.lastBookId == bookId && settings.lastChapterIndex == chapterIdx) {
                resumeApplied = true
                settings.lastPositionMs
            } else 0L
        } else 0L

        playerController.prepare(
            mediaId = "${summary.id}#${chapterIdx}",
            audioSource = summary.audio,
            resumePositionMs = resumePosition,
            playWhenReady = false
        )
    }

    private fun applySnapshot(snapshot: PlayerSnapshot) {
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

    fun onTogglePlayPause() = playerController.togglePlayPause()

    fun onSeekTo(fraction: Float) {
        val duration = uiState.value.durationMs.takeIf { it > 0 } ?: return
        playerController.seekTo((duration * fraction.coerceIn(0f, 1f)).toLong())
    }

    fun onSegmentTapped(index: Int) {
        uiState.value.segments.getOrNull(index)?.let { playerController.seekTo(it.startMs) }
    }

    fun onSelectChapter(index: Int) {
        chapterIndex.value = index.coerceIn(0, (uiState.value.chapterTitles.lastIndex).coerceAtLeast(0))
    }

    fun onSelectLanguage(language: String?) {
        languageSelection.value = language
    }

    fun onLayoutPreferenceChange(mode: TranscriptPaneMode?) {
        layoutPreference.value = mode
    }

    override fun onCleared() {
        super.onCleared()
        saveJob?.cancel()
    }
}
