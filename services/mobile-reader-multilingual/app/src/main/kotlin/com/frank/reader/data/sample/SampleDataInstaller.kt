package com.frank.reader.data.sample

import android.content.Context
import android.net.Uri
import androidx.core.net.toUri
import androidx.media3.common.MimeTypes
import com.frank.reader.model.AudioSource
import com.frank.reader.model.BookChapterMeta
import com.frank.reader.model.BookSummary
import com.frank.reader.model.ChapterSource
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.PI
import kotlin.math.sin

class SampleDataInstaller @Inject constructor(
    private val context: Context
) {

    companion object {
        private const val SAMPLE_BOOK_ID = "demo-sample-book"
        private const val SAMPLE_BOOK_TITLE = "Demo Sample Book"
        private const val ASSET_ROOT = "sample_book"
        private const val STT_DIR = "$ASSET_ROOT/.stt"
        private const val SAMPLE_AUDIO_FILE_NAME = "sample_chapter.m4b"
    }

    @Volatile
    private var cachedSummary: BookSummary? = null

    suspend fun sampleBook(): BookSummary {
        cachedSummary?.let { return it }
        val built = buildSampleBook()
        cachedSummary = built
        return built
    }

    private suspend fun buildSampleBook(): BookSummary = withContext(Dispatchers.IO) {
        val transcriptFiles = context.assets.list(STT_DIR)?.filter { name ->
            name.endsWith(".json") && !name.contains(".translation-")
        }?.sorted().orEmpty()

        val chapters = transcriptFiles.mapIndexed { index, fileName ->
            val baseName = fileName.substringBeforeLast(".json")
            val translations = context.assets.list(STT_DIR)?.filter { candidate ->
                candidate.startsWith("$baseName.translation-") && candidate.endsWith(".json")
            }?.associate { translationFile ->
                val language = translationFile.substringAfter(".translation-").substringBeforeLast(".json")
                language to "$STT_DIR/$translationFile"
            }.orEmpty()

            BookChapterMeta(
                index = index,
                displayName = "Chapter ${index + 1}",
                source = ChapterSource.Asset(
                    transcriptAssetPath = "$STT_DIR/$fileName",
                    translationAssetPaths = translations
                )
            )
        }

        val audioUri = ensureSampleAudio()
        BookSummary(
            id = SAMPLE_BOOK_ID,
            title = SAMPLE_BOOK_TITLE,
            audio = AudioSource(uri = audioUri, mimeType = MimeTypes.AUDIO_WAV),
            chapters = chapters,
            availableLanguages = chapters.flatMap { it.languages }.toSet()
        )
    }

    private suspend fun ensureSampleAudio(): Uri = withContext(Dispatchers.IO) {
        val dir = File(context.filesDir, ASSET_ROOT).apply { mkdirs() }
        val audioFile = File(dir, SAMPLE_AUDIO_FILE_NAME)
        if (!audioFile.exists()) {
            FileOutputStream(audioFile).use { output ->
                output.write(generateSineWaveWav())
            }
        }
        audioFile.toUri()
    }

    private fun generateSineWaveWav(
        seconds: Double = 18.0,
        frequencyHz: Double = 220.0,
        sampleRate: Int = 44_100,
        amplitude: Short = (Short.MAX_VALUE.toInt() / 6).toShort()
    ): ByteArray {
        val totalSamples = (seconds * sampleRate).toInt()
        val pcm = ByteArray(totalSamples * 2)
        var i = 0
        for (sample in 0 until totalSamples) {
            val angle = 2.0 * PI * frequencyHz * (sample.toDouble() / sampleRate)
            val value = (sin(angle) * amplitude).toInt().toShort()
            pcm[i++] = (value.toInt() and 0xFF).toByte()
            pcm[i++] = (value.toInt() shr 8 and 0xFF).toByte()
        }

        val dataSize = pcm.size
        val totalDataLen = 36 + dataSize
        val byteRate = sampleRate * 2
        val header = ByteArray(44)
        header[0] = 'R'.code.toByte()
        header[1] = 'I'.code.toByte()
        header[2] = 'F'.code.toByte()
        header[3] = 'F'.code.toByte()
        writeIntLE(header, 4, totalDataLen)
        header[8] = 'W'.code.toByte()
        header[9] = 'A'.code.toByte()
        header[10] = 'V'.code.toByte()
        header[11] = 'E'.code.toByte()
        header[12] = 'f'.code.toByte()
        header[13] = 'm'.code.toByte()
        header[14] = 't'.code.toByte()
        header[15] = ' '.code.toByte()
        writeIntLE(header, 16, 16)
        writeShortLE(header, 20, 1)
        writeShortLE(header, 22, 1)
        writeIntLE(header, 24, sampleRate)
        writeIntLE(header, 28, byteRate)
        writeShortLE(header, 32, 2)
        writeShortLE(header, 34, 16)
        header[36] = 'd'.code.toByte()
        header[37] = 'a'.code.toByte()
        header[38] = 't'.code.toByte()
        header[39] = 'a'.code.toByte()
        writeIntLE(header, 40, dataSize)

        return header + pcm
    }

    private fun writeIntLE(target: ByteArray, offset: Int, value: Int) {
        target[offset] = (value and 0xFF).toByte()
        target[offset + 1] = (value shr 8 and 0xFF).toByte()
        target[offset + 2] = (value shr 16 and 0xFF).toByte()
        target[offset + 3] = (value shr 24 and 0xFF).toByte()
    }

    private fun writeShortLE(target: ByteArray, offset: Int, value: Int) {
        target[offset] = (value and 0xFF).toByte()
        target[offset + 1] = (value shr 8 and 0xFF).toByte()
    }
}
