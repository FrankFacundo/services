package com.frank.reader.player

import android.content.Context
import android.util.Log
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
    private var lastLoggedDurationMs: Long = -1L

    init {
        Log.d("PlayerController", "Initializing PlayerController with context=${context.packageName}")
        exoPlayer.addListener(object : Player.Listener {
            override fun onEvents(player: Player, events: Player.Events) {
                syncFromPlayer()
            }

            override fun onPlayerError(error: PlaybackException) {
                Log.e("PlayerController", "Playback error", error)
                _snapshot.update { it.copy(error = error) }
            }
        })

        scope.launch {
            Log.d("PlayerController", "Starting snapshot sync loop")
            while (true) {
                syncFromPlayer()
                delay(80L)
            }
        }
    }

    private fun syncFromPlayer() {
        val reportedDuration = if (exoPlayer.duration > 0) exoPlayer.duration else _snapshot.value.durationMs
        if (reportedDuration > 0 && reportedDuration != lastLoggedDurationMs) {
            lastLoggedDurationMs = reportedDuration
            Log.d(
                "PlayerController",
                "ExoPlayer duration=${reportedDuration}ms (~${reportedDuration / 1000.0}s)"
            )
        }
        _snapshot.update {
            it.copy(
                mediaItemId = exoPlayer.currentMediaItem?.mediaId,
                isPlaying = exoPlayer.isPlaying,
                positionMs = exoPlayer.currentPosition.coerceAtLeast(0L),
                durationMs = if (reportedDuration > 0) reportedDuration else it.durationMs,
                bufferedPositionMs = exoPlayer.bufferedPosition
            )
        }
    }

    fun prepare(mediaId: String, audioSource: AudioSource, resumePositionMs: Long?, playWhenReady: Boolean) {
        val needsNewItem = currentMediaId != mediaId
        Log.d(
            "PlayerController",
            "prepare mediaId=$mediaId needsNewItem=$needsNewItem resume=$resumePositionMs playWhenReady=$playWhenReady uri=${audioSource.uri} mime=${audioSource.mimeType}"
        )
        if (needsNewItem) {
            val mediaItem = MediaItem.Builder()
                .setUri(audioSource.uri)
                .setMediaId(mediaId)
                .setMimeType(audioSource.mimeType ?: MimeTypes.AUDIO_UNKNOWN)
                .build()
            exoPlayer.setMediaItem(mediaItem)
            exoPlayer.prepare()
            val item = exoPlayer.currentMediaItem
            Log.d("PlayerController", "Prepared item=$item duration=${exoPlayer.duration}")

            currentMediaId = mediaId
        }

        if (resumePositionMs != null) {
            Log.d("PlayerController", "Seeking to resume position=$resumePositionMs")
            exoPlayer.seekTo(resumePositionMs.coerceAtLeast(0L))
        }

        exoPlayer.playWhenReady = playWhenReady
        Log.d(
            "PlayerController",
            "Prepared complete mediaId=$mediaId playWhenReady=${exoPlayer.playWhenReady} duration=${exoPlayer.duration}"
        )
    }

    fun play() {
        Log.d("PlayerController", "play() called currentMediaId=$currentMediaId")
        exoPlayer.playWhenReady = true
        exoPlayer.play()
    }

    fun pause() {
        Log.d("PlayerController", "pause() called currentMediaId=$currentMediaId")
        exoPlayer.playWhenReady = false
        exoPlayer.pause()
    }

    fun togglePlayPause() {
        Log.d("PlayerController", "togglePlayPause() called isPlaying=${exoPlayer.isPlaying}")
        if (exoPlayer.isPlaying) pause() else play()
    }

    fun seekTo(positionMs: Long) {
        Log.d("PlayerController", "seekTo($positionMs) called currentDuration=${exoPlayer.duration}")
        exoPlayer.seekTo(positionMs.coerceAtLeast(0L))
    }

    fun release() {
        Log.d("PlayerController", "release() called currentMediaId=$currentMediaId")
        exoPlayer.release()
    }
}
