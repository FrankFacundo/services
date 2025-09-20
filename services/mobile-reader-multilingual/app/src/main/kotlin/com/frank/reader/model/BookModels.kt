package com.frank.reader.model

import android.net.Uri

data class BookSummary(
    val id: String,
    val title: String,
    val audio: AudioSource,
    val chapters: List<BookChapterMeta>,
    val availableLanguages: Set<String>
)

data class BookChapterMeta(
    val index: Int,
    val displayName: String,
    val source: ChapterSource
) {
    val languages: Set<String> = source.availableLanguages()
}

data class AudioSource(
    val uri: Uri,
    val mimeType: String?
)

sealed class ChapterSource {
    data class Asset(
        val transcriptAssetPath: String,
        val translationAssetPaths: Map<String, String>
    ) : ChapterSource()

    data class Document(
        val transcriptUri: Uri,
        val translationUris: Map<String, Uri>
    ) : ChapterSource()
}

fun ChapterSource.availableLanguages(): Set<String> = when (this) {
    is ChapterSource.Asset -> translationAssetPaths.keys
    is ChapterSource.Document -> translationUris.keys
}.toSet()

data class ChapterAlignment(
    val translationLanguage: String?,
    val translationTexts: List<String?>,
    val translationMapping: IntArray
)

data class ChapterContent(
    val transcript: TranscriptChapter,
    val translation: TranslationChapter?,
    val alignment: ChapterAlignment
)
