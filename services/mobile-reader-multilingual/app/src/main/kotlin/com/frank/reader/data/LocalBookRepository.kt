package com.frank.reader.data

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import com.frank.reader.data.sample.SampleDataInstaller
import com.frank.reader.model.AudioSource
import com.frank.reader.model.BookChapterMeta
import com.frank.reader.model.BookSummary
import com.frank.reader.model.ChapterContent
import com.frank.reader.model.ChapterSource
import com.frank.reader.model.TranscriptChapter
import com.frank.reader.model.TranslationChapter
import com.frank.reader.prefs.LibraryRoot
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json

interface TranscriptsRepository {
    suspend fun loadBooks(root: LibraryRoot): List<BookSummary>
    suspend fun loadBook(root: LibraryRoot, bookId: String): BookSummary?
    suspend fun loadChapter(
        root: LibraryRoot,
        bookId: String,
        chapterIndex: Int,
        language: String?
    ): ChapterContent?
}

@Singleton
class LocalBookRepository @Inject constructor(
    private val context: Context,
    private val json: Json,
    private val sampleDataInstaller: SampleDataInstaller
) : TranscriptsRepository {

    private val resolver: ContentResolver = context.contentResolver

    override suspend fun loadBooks(root: LibraryRoot): List<BookSummary> = when (root) {
        LibraryRoot.Demo -> listOf(sampleDataInstaller.sampleBook())
        is LibraryRoot.DocumentTree -> scanDocumentRoot(root.uri)
    }

    override suspend fun loadBook(root: LibraryRoot, bookId: String): BookSummary? = when (root) {
        LibraryRoot.Demo -> sampleDataInstaller.sampleBook()
        is LibraryRoot.DocumentTree -> scanDocumentRoot(root.uri).firstOrNull { it.id == bookId }
    }

    override suspend fun loadChapter(
        root: LibraryRoot,
        bookId: String,
        chapterIndex: Int,
        language: String?
    ): ChapterContent? {
        val summary = loadBook(root, bookId) ?: return null
        val chapter = summary.chapters.firstOrNull { it.index == chapterIndex } ?: return null
        val transcript = when (val source = chapter.source) {
            is ChapterSource.Asset -> parseTranscriptFromAssets(source.transcriptAssetPath)
            is ChapterSource.Document -> parseTranscriptFromUri(source.transcriptUri)
        }
        val translation = language?.let { lang ->
            when (val source = chapter.source) {
                is ChapterSource.Asset -> source.translationAssetPaths[lang]?.let { parseTranslationFromAssets(it) }
                is ChapterSource.Document -> source.translationUris[lang]?.let { parseTranslationFromUri(it) }
            }
        } ?: run {
            val fallback = chapter.languages.firstOrNull()
            when {
                fallback == null -> null
                chapter.source is ChapterSource.Asset -> chapter.source.translationAssetPaths[fallback]?.let { parseTranslationFromAssets(it) }
                chapter.source is ChapterSource.Document -> chapter.source.translationUris[fallback]?.let { parseTranslationFromUri(it) }
                else -> null
            }
        }

        val matcher = TranslationMatcher(transcript.segments)
        val alignment = matcher.align(translation)

        return ChapterContent(
            transcript = transcript,
            translation = translation,
            alignment = alignment
        )
    }

    private suspend fun parseTranscriptFromAssets(assetPath: String): TranscriptChapter =
        withContext(Dispatchers.IO) {
            context.assets.open(assetPath).use { stream ->
                BufferedReader(InputStreamReader(stream)).use { reader ->
                    json.decodeFromString(TranscriptChapter.serializer(), reader.readText())
                }
            }
        }

    private suspend fun parseTranslationFromAssets(assetPath: String): TranslationChapter =
        withContext(Dispatchers.IO) {
            context.assets.open(assetPath).use { stream ->
                BufferedReader(InputStreamReader(stream)).use { reader ->
                    json.decodeFromString(TranslationChapter.serializer(), reader.readText())
                }
            }
        }

    private suspend fun parseTranscriptFromUri(uri: Uri): TranscriptChapter =
        withContext(Dispatchers.IO) {
            resolver.openInputStream(uri)?.use { stream ->
                BufferedReader(InputStreamReader(stream)).use { reader ->
                    json.decodeFromString(TranscriptChapter.serializer(), reader.readText())
                }
            } ?: error("Unable to open transcript: $uri")
        }

    private suspend fun parseTranslationFromUri(uri: Uri): TranslationChapter =
        withContext(Dispatchers.IO) {
            resolver.openInputStream(uri)?.use { stream ->
                BufferedReader(InputStreamReader(stream)).use { reader ->
                    json.decodeFromString(TranslationChapter.serializer(), reader.readText())
                }
            } ?: error("Unable to open translation: $uri")
        }

    private suspend fun scanDocumentRoot(rootUri: Uri): List<BookSummary> = withContext(Dispatchers.IO) {
        val rootDoc = DocumentFile.fromTreeUri(context, rootUri) ?: return@withContext emptyList()
        val bookDirs = rootDoc.listFiles().filter { it.isDirectory }
        bookDirs.mapNotNull { bookDir ->
            val audioFile = bookDir.listFiles().firstOrNull { file ->
                file.isFile && file.name?.lowercase(Locale.ROOT)?.endsWith(".m4b") == true
            } ?: return@mapNotNull null

            val transcriptDir = bookDir.findFile(".stt")
            val sttFiles = when {
                transcriptDir == null -> collectDocumentFiles(bookDir)
                transcriptDir.isFile -> listOf(transcriptDir)
                else -> collectDocumentFiles(transcriptDir)
            }

            val transcriptFiles = sttFiles.filter { file ->
                file.name.orEmpty().endsWith(".json") && !file.name.orEmpty().contains(".translation-")
            }.sortedBy { it.name.orEmpty() }

            if (transcriptFiles.isEmpty()) return@mapNotNull null

            val translationFilesByBase = sttFiles
                .filter { candidate ->
                    val name = candidate.name.orEmpty()
                    name.endsWith(".json") && name.contains(".translation-")
                }
                .groupBy { candidate ->
                    candidate.name.orEmpty().substringBefore(".translation-")
                }

            val chapters = transcriptFiles.mapIndexed { index, transcriptFile ->
                val transcriptName = transcriptFile.name.orEmpty()
                val baseName = transcriptName.substringBeforeLast(".json")
                val translations = translationFilesByBase[baseName]
                    ?.mapNotNull { candidate ->
                        val language = candidate.name.orEmpty()
                            .substringAfter(".translation-")
                            .substringBeforeLast(".json")
                            .takeIf { it.isNotBlank() }
                        language?.let { it to candidate.uri }
                    }
                    ?.toMap()
                    ?: emptyMap()

                BookChapterMeta(
                    index = index,
                    displayName = baseName.replace('_', ' ').replaceFirstChar { it.titlecase(Locale.ROOT) },
                    source = ChapterSource.Document(
                        transcriptUri = transcriptFile.uri,
                        translationUris = translations
                    )
                )
            }

            BookSummary(
                id = bookDir.uri.toString(),
                title = bookDir.name ?: "Book",
                audio = AudioSource(audioFile.uri, mimeType = null),
                chapters = chapters,
                availableLanguages = chapters.flatMap { it.languages }.toSet()
            )
        }
    }
}

private fun collectDocumentFiles(root: DocumentFile): List<DocumentFile> {
    if (!root.isDirectory) return emptyList()
    val files = mutableListOf<DocumentFile>()

    fun traverse(current: DocumentFile) {
        current.listFiles().forEach { child ->
            when {
                child.isDirectory -> traverse(child)
                child.isFile -> files.add(child)
            }
        }
    }

    traverse(root)
    return files
}
