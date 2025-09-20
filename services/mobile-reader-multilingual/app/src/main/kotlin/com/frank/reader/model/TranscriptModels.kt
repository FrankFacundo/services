package com.frank.reader.model

import kotlinx.serialization.Serializable

@Serializable
data class TranscriptChapter(
    val source: String? = null,
    val chapterIndex: Int = 0,
    val start: Double = 0.0,
    val end: Double = 0.0,
    val duration: Double = 0.0,
    val text: String? = null,
    val segments: List<TranscriptSegment> = emptyList(),
    val createdAt: String? = null
)

@Serializable
data class TranscriptSegment(
    val id: Int? = null,
    val seek: Int? = null,
    val start: Double,
    val end: Double,
    val text: String
)

@Serializable
data class TranslationChapter(
    val source: String? = null,
    val chapterIndex: Int = 0,
    val targetLanguage: String,
    val createdAt: String? = null,
    val detectedSourceLanguage: String? = null,
    val segments: List<TranslationSegment> = emptyList()
)

@Serializable
data class TranslationSegment(
    val start: Double,
    val end: Double,
    val text: String,
    val originalText: String? = null
)
