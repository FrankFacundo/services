package com.frank.reader.data

import com.frank.reader.model.ChapterAlignment
import com.frank.reader.model.TranslationChapter
import com.frank.reader.model.TranscriptSegment
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

class SegmentIndexFinder(private val segments: List<TranscriptSegment>) {

    fun findActiveIndex(positionMs: Long): Int {
        if (segments.isEmpty()) return -1
        val time = positionMs / 1000.0
        var low = 0
        var high = segments.lastIndex

        while (low <= high) {
            val mid = (low + high) / 2
            val segment = segments[mid]
            when {
                time < segment.start -> high = mid - 1
                time >= segment.end -> low = mid + 1
                else -> return mid
            }
        }

        return when {
            low >= segments.size -> segments.lastIndex
            high < 0 -> 0
            else -> min(low, segments.lastIndex)
        }
    }
}

class TranslationMatcher(
    private val transcriptSegments: List<TranscriptSegment>
) {

    fun align(translationChapter: TranslationChapter?): ChapterAlignment {
        if (transcriptSegments.isEmpty()) {
            return ChapterAlignment(
                translationLanguage = translationChapter?.targetLanguage,
                translationTexts = emptyList(),
                translationMapping = IntArray(0)
            )
        }
        val translationSegments = translationChapter?.segments.orEmpty()
        val mapping = IntArray(transcriptSegments.size) { -1 }
        val texts = MutableList<String?>(transcriptSegments.size) { null }

        if (translationSegments.isEmpty()) {
            return ChapterAlignment(
                translationLanguage = translationChapter?.targetLanguage,
                translationTexts = texts,
                translationMapping = mapping
            )
        }

        transcriptSegments.forEachIndexed { index, segment ->
            var bestIndex = -1
            var bestScore = 0.0
            translationSegments.forEachIndexed { translationIndex, candidate ->
                val score = overlapScore(segment.start, segment.end, candidate.start, candidate.end)
                if (score > bestScore) {
                    bestScore = score
                    bestIndex = translationIndex
                }
            }
            if (bestIndex >= 0) {
                mapping[index] = bestIndex
                texts[index] = translationSegments[bestIndex].text.trim().ifEmpty { null }
            }
        }

        return ChapterAlignment(
            translationLanguage = translationChapter?.targetLanguage,
            translationTexts = texts,
            translationMapping = mapping
        )
    }

    private fun overlapScore(
        startA: Double,
        endA: Double,
        startB: Double,
        endB: Double
    ): Double {
        val intersection = max(0.0, min(endA, endB) - max(startA, startB))
        if (intersection <= 0) return 0.0
        val union = (endA - startA) + (endB - startB) - intersection
        if (union <= 0) return 0.0
        val proximity = 1.0 / (1.0 + abs(startA - startB))
        return (intersection / union) * proximity
    }
}
