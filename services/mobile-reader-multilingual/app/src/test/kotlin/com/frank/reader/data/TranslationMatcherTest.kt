package com.frank.reader.data

import com.frank.reader.model.TranslationChapter
import com.frank.reader.model.TranslationSegment
import com.frank.reader.model.TranscriptSegment
import kotlin.test.assertEquals
import kotlin.test.assertNull
import org.junit.Test

class TranslationMatcherTest {

    private val transcriptSegments = listOf(
        TranscriptSegment(id = 0, seek = null, start = 0.0, end = 2.0, text = "One"),
        TranscriptSegment(id = 1, seek = null, start = 2.0, end = 4.0, text = "Two"),
        TranscriptSegment(id = 2, seek = null, start = 4.0, end = 6.0, text = "Three")
    )
    private val translation = TranslationChapter(
        targetLanguage = "es",
        segments = listOf(
            TranslationSegment(start = 0.0, end = 2.0, text = "Uno", originalText = "One"),
            TranslationSegment(start = 2.0, end = 4.0, text = "Dos", originalText = "Two"),
            TranslationSegment(start = 4.0, end = 6.0, text = "Tres", originalText = "Three")
        )
    )

    @Test
    fun alignMatchesSegments() {
        val matcher = TranslationMatcher(transcriptSegments)
        val alignment = matcher.align(translation)
        assertEquals("es", alignment.translationLanguage)
        assertEquals("Uno", alignment.translationTexts[0])
        assertEquals("Dos", alignment.translationTexts[1])
        assertEquals("Tres", alignment.translationTexts[2])
    }

    @Test
    fun alignHandlesMissingTranslation() {
        val matcher = TranslationMatcher(transcriptSegments)
        val alignment = matcher.align(null)
        assertNull(alignment.translationLanguage)
        assertEquals(-1, alignment.translationMapping[1])
        assertNull(alignment.translationTexts[1])
    }
}
