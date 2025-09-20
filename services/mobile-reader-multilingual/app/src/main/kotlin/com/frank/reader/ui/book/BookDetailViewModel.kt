package com.frank.reader.ui.book

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.frank.reader.data.TranscriptsRepository
import com.frank.reader.prefs.ReaderPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class BookDetailUiState(
    val isLoading: Boolean = true,
    val bookTitle: String = "",
    val chapters: List<String> = emptyList()
)

@HiltViewModel
class BookDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: TranscriptsRepository,
    private val preferences: ReaderPreferences
) : ViewModel() {

    private val bookId: String = savedStateHandle["bookId"] ?: error("Missing bookId")

    private val _state = MutableStateFlow(BookDetailUiState())
    val state: StateFlow<BookDetailUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            preferences.settings.collect { settings ->
                val book = repository.loadBook(settings.root, bookId)
                _state.update {
                    it.copy(
                        isLoading = false,
                        bookTitle = book?.title ?: "Book",
                        chapters = book?.chapters?.map { chapter -> chapter.displayName } ?: emptyList()
                    )
                }
            }
        }
    }
}
