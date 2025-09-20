package com.frank.reader.prefs

import android.net.Uri
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

sealed class LibraryRoot {
    object Demo : LibraryRoot()
    data class DocumentTree(val uri: Uri) : LibraryRoot()
}

data class ReaderSettings(
    val root: LibraryRoot,
    val lastBookId: String? = null,
    val lastChapterIndex: Int = 0,
    val lastPositionMs: Long = 0L,
    val lastLanguage: String? = null
)

@Singleton
class ReaderPreferences @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {

    private val keyRootType = stringPreferencesKey("root_type")
    private val keyRootUri = stringPreferencesKey("root_uri")
    private val keyLastBook = stringPreferencesKey("last_book")
    private val keyLastChapter = intPreferencesKey("last_chapter")
    private val keyLastPosition = longPreferencesKey("last_position")
    private val keyLastLanguage = stringPreferencesKey("last_language")

    val settings: Flow<ReaderSettings> = dataStore.data
        .map { prefs ->
            val root = when (prefs[keyRootType]) {
                "tree" -> prefs[keyRootUri]?.let { LibraryRoot.DocumentTree(Uri.parse(it)) } ?: LibraryRoot.Demo
                else -> LibraryRoot.Demo
            }
            ReaderSettings(
                root = root,
                lastBookId = prefs[keyLastBook],
                lastChapterIndex = prefs[keyLastChapter] ?: 0,
                lastPositionMs = prefs[keyLastPosition] ?: 0L,
                lastLanguage = prefs[keyLastLanguage]
            )
        }
        .distinctUntilChanged()

    suspend fun setRoot(root: LibraryRoot) {
        dataStore.edit { prefs ->
            when (root) {
                LibraryRoot.Demo -> {
                    prefs[keyRootType] = "demo"
                    prefs.remove(keyRootUri)
                }

                is LibraryRoot.DocumentTree -> {
                    prefs[keyRootType] = "tree"
                    prefs[keyRootUri] = root.uri.toString()
                }
            }
        }
    }

    suspend fun updateLastPlayback(
        bookId: String,
        chapterIndex: Int,
        positionMs: Long,
        language: String?
    ) {
        dataStore.edit { prefs ->
            prefs[keyLastBook] = bookId
            prefs[keyLastChapter] = chapterIndex
            prefs[keyLastPosition] = positionMs
            if (language != null) {
                prefs[keyLastLanguage] = language
            } else {
                prefs.remove(keyLastLanguage)
            }
        }
    }
}
