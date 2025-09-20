package com.frank.reader.data

import com.frank.reader.model.TranscriptSegment
import kotlin.test.assertEquals
import org.junit.Test

class SegmentIndexFinderTest {

    private val segments = listOf(
        TranscriptSegment(id = 0, seek = null, start = 0.0, end = 2.0, text = "Hello"),
        TranscriptSegment(id = 1, seek = null, start = 2.0, end = 5.0, text = "World"),
        TranscriptSegment(id = 2, seek = null, start = 5.0, end = 10.0, text = "Again")
    )
    private val finder = SegmentIndexFinder(segments)

    @Test
    fun findActiveIndexWithinBounds() {
        assertEquals(0, finder.findActiveIndex(1000))
        assertEquals(1, finder.findActiveIndex(3000))
        assertEquals(2, finder.findActiveIndex(8000))
    }

    @Test
    fun findActiveIndexBeforeFirstSegment() {
        assertEquals(0, finder.findActiveIndex(0))
    }

    @Test
    fun findActiveIndexAfterLastSegment() {
        assertEquals(2, finder.findActiveIndex(12000))
    }
}
