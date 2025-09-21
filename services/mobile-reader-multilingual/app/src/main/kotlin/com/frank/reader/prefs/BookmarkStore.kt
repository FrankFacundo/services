package com.frank.reader.prefs

import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

@Serializable
data class BookmarkRecord(
    val id: String,
    val bookId: String,
    val chapterIndex: Int,
    val positionMs: Long,
    val segmentIndex: Int,
    val createdAtEpochMs: Long
)

@Singleton
class BookmarkStore @Inject constructor(
    private val dataStore: DataStore<Preferences>,
    private val json: Json
) {

    private val keyBookmarks = stringPreferencesKey("bookmarks_v1")
    private val bookmarkListSerializer = ListSerializer(BookmarkRecord.serializer())

    val bookmarks: Flow<List<BookmarkRecord>> = dataStore.data
        .catch { error ->
            Log.w("BookmarkStore", "Failed to read bookmarks", error)
            emit(emptyPreferences())
        }
        .map { prefs ->
            val raw = prefs[keyBookmarks] ?: return@map emptyList()
            runCatching {
                json.decodeFromString(bookmarkListSerializer, raw)
            }.onFailure { throwable ->
                if (throwable !is SerializationException) {
                    Log.e("BookmarkStore", "Unexpected error decoding bookmarks", throwable)
                } else {
                    Log.w(
                        "BookmarkStore",
                        "Unable to parse stored bookmarks; treating as empty",
                        throwable
                    )
                }
            }.getOrElse { emptyList() }
        }

    suspend fun upsert(bookmark: BookmarkRecord) {
        dataStore.edit { prefs ->
            val current = decodeBookmarks(prefs[keyBookmarks])
            val updated = current.filterNot { it.id == bookmark.id } + bookmark
            prefs[keyBookmarks] = json.encodeToString(
                bookmarkListSerializer,
                updated.sortedBy { it.createdAtEpochMs }
            )
        }
    }

    suspend fun delete(id: String) {
        dataStore.edit { prefs ->
            val current = decodeBookmarks(prefs[keyBookmarks])
            val updated = current.filterNot { it.id == id }
            if (updated.isEmpty()) {
                prefs.remove(keyBookmarks)
            } else {
                prefs[keyBookmarks] = json.encodeToString(bookmarkListSerializer, updated)
            }
        }
    }

    suspend fun deleteAll(predicate: (BookmarkRecord) -> Boolean) {
        dataStore.edit { prefs ->
            val current = decodeBookmarks(prefs[keyBookmarks])
            val updated = current.filterNot(predicate)
            if (updated.isEmpty()) {
                prefs.remove(keyBookmarks)
            } else {
                prefs[keyBookmarks] = json.encodeToString(bookmarkListSerializer, updated)
            }
        }
    }

    private fun decodeBookmarks(raw: String?): List<BookmarkRecord> = raw?.let {
        runCatching { json.decodeFromString(bookmarkListSerializer, it) }
            .onFailure { error ->
                Log.w("BookmarkStore", "Failed to decode bookmark list", error)
            }
            .getOrElse { emptyList() }
    } ?: emptyList()
}
