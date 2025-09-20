package com.frank.reader.ui.library

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.frank.reader.data.TranscriptsRepository
import com.frank.reader.model.BookSummary
import com.frank.reader.prefs.LibraryRoot
import com.frank.reader.prefs.ReaderPreferences
import com.frank.reader.prefs.ReaderSettings
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ResumeTarget(
    val bookId: String,
    val bookTitle: String,
    val chapterIndex: Int
)

data class LibraryUiState(
    val isLoading: Boolean = true,
    val books: List<BookSummary> = emptyList(),
    val errorMessage: String? = null,
    val settings: ReaderSettings? = null,
    val resumeTarget: ResumeTarget? = null
)

@HiltViewModel
class LibraryViewModel @Inject constructor(
    private val repository: TranscriptsRepository,
    private val preferences: ReaderPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(LibraryUiState())
    val state: StateFlow<LibraryUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            preferences.settings.collectLatest { settings ->
                _state.update { it.copy(settings = settings, isLoading = true) }
                val books = runCatching { repository.loadBooks(settings.root) }
                    .onFailure { error -> _state.update { state -> state.copy(errorMessage = error.localizedMessage, isLoading = false) } }
                    .getOrElse { emptyList() }
                val resumeTarget = settings.lastBookId?.let { bookId ->
                    books.firstOrNull { it.id == bookId }?.let { book ->
                        ResumeTarget(bookId = book.id, bookTitle = book.title, chapterIndex = settings.lastChapterIndex)
                    }
                }
                _state.update {
                    it.copy(
                        books = books,
                        resumeTarget = resumeTarget,
                        isLoading = false,
                        errorMessage = null
                    )
                }
            }
        }
    }

    fun onUseDemoRequested() {
        viewModelScope.launch {
            preferences.setRoot(LibraryRoot.Demo)
        }
    }

    fun onRootSelected(uri: Uri) {
        viewModelScope.launch {
            preferences.setRoot(LibraryRoot.DocumentTree(uri))
        }
    }
}
