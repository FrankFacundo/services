package com.frank.reader.ui.library

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.material3.windowsizeclass.WindowSizeClass

@Suppress("UNUSED_PARAMETER")
@Composable
fun LibraryRoute(
    windowSizeClass: WindowSizeClass,
    activity: Activity,
    onBookClick: (String) -> Unit,
    onResumeBook: (ResumeTarget) -> Unit,
    viewModel: LibraryViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsState()
    val pickLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri: Uri? ->
        uri ?: return@rememberLauncherForActivityResult
        val contentResolver = context.contentResolver
        val readWriteFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        try {
            contentResolver.takePersistableUriPermission(uri, readWriteFlags)
        } catch (_: SecurityException) {
            contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        Log.d("LibraryRoute", "Persisted uri permission for $uri")
        viewModel.onRootSelected(uri)
        Log.d("LibraryRoute", "Selected library root: $uri")
    }

    LibraryScreen(
        state = state,
        onUseDemo = viewModel::onUseDemoRequested,
        onPickRoot = { pickLauncher.launch(null) },
        onBookClick = onBookClick,
        onResumeBook = onResumeBook
    )
}

@Composable
fun LibraryScreen(
    state: LibraryUiState,
    onUseDemo: () -> Unit,
    onPickRoot: () -> Unit,
    onBookClick: (String) -> Unit,
    onResumeBook: (ResumeTarget) -> Unit
) {
    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = "Library", style = MaterialTheme.typography.headlineSmall)
                OutlinedButton(onClick = onPickRoot) {
                    Text("Choose folder")
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(onClick = onUseDemo) {
                    Text("Use demo library")
                }
                state.resumeTarget?.let { resume ->
                    OutlinedButton(onClick = { onResumeBook(resume) }) {
                        Text("Resume \"${resume.bookTitle}\"")
                    }
                }
            }

            state.errorMessage?.let { error ->
                Text(text = error, color = MaterialTheme.colorScheme.error)
            }

            when {
                state.isLoading -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator()
                        Spacer(modifier = Modifier.padding(4.dp))
                        Text("Scanning audiobooks…")
                    }
                }

                state.books.isEmpty() -> {
                    Text(
                        text = "No books found in the selected folder.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(state.books) { book ->
                            BookCard(
                                title = book.title,
                                languages = book.availableLanguages,
                                chapterCount = book.chapters.size,
                                onClick = { onBookClick(book.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BookCard(
    title: String,
    languages: Set<String>,
    chapterCount: Int,
    onClick: () -> Unit
) {
    ElevatedCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(text = title, style = MaterialTheme.typography.titleMedium)
            Text(text = "$chapterCount chapters", style = MaterialTheme.typography.bodyMedium)
            if (languages.isNotEmpty()) {
                Text(
                    text = "Translations: ${languages.joinToString().uppercase()}",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}
