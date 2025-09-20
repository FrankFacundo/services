package com.frank.reader.player

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.frank.reader.model.AudioSource
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class PlayerSnapshot(
    val mediaItemId: String? = null,
    val isPlaying: Boolean = false,
    val positionMs: Long = 0L,
    val durationMs: Long = 0L,
    val bufferedPositionMs: Long = 0L,
    val error: PlaybackException? = null
)

@Singleton
class PlayerController @Inject constructor(
    context: Context
) {

    private val exoPlayer: ExoPlayer = ExoPlayer.Builder(context).build()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private val _snapshot = MutableStateFlow(PlayerSnapshot())
    val snapshot: StateFlow<PlayerSnapshot> = _snapshot.asStateFlow()

    private var currentMediaId: String? = null

    init {
        exoPlayer.addListener(object : Player.Listener {
            override fun onEvents(player: Player, events: Player.Events) {
                syncFromPlayer()
            }

            override fun onPlayerError(error: PlaybackException) {
                _snapshot.update { it.copy(error = error) }
            }
        })

        scope.launch {
            while (true) {
                syncFromPlayer()
                delay(80L)
            }
        }
    }

    private fun syncFromPlayer() {
        _snapshot.update {
            it.copy(
                mediaItemId = exoPlayer.currentMediaItem?.mediaId,
                isPlaying = exoPlayer.isPlaying,
                positionMs = exoPlayer.currentPosition.coerceAtLeast(0L),
                durationMs = if (exoPlayer.duration > 0) exoPlayer.duration else it.durationMs,
                bufferedPositionMs = exoPlayer.bufferedPosition
            )
        }
    }

    fun prepare(mediaId: String, audioSource: AudioSource, resumePositionMs: Long, playWhenReady: Boolean) {
        if (currentMediaId != mediaId) {
            val mediaItem = MediaItem.Builder()
                .setUri(audioSource.uri)
                .setMediaId(mediaId)
                .setMimeType(audioSource.mimeType ?: MimeTypes.AUDIO_UNKNOWN)
                .build()
            exoPlayer.setMediaItem(mediaItem, resumePositionMs)
            exoPlayer.prepare()
            currentMediaId = mediaId
        } else if (resumePositionMs >= 0) {
            exoPlayer.seekTo(resumePositionMs)
        }
        exoPlayer.playWhenReady = playWhenReady
    }

    fun play() {
        exoPlayer.playWhenReady = true
        exoPlayer.play()
    }

    fun pause() {
        exoPlayer.playWhenReady = false
        exoPlayer.pause()
    }

    fun togglePlayPause() {
        if (exoPlayer.isPlaying) pause() else play()
    }

    fun seekTo(positionMs: Long) {
        exoPlayer.seekTo(positionMs.coerceAtLeast(0L))
    }

    fun release() {
        exoPlayer.release()
    }
}
