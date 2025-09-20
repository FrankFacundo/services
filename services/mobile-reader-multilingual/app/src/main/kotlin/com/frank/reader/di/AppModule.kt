package com.frank.reader.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import androidx.window.layout.WindowInfoTracker
import com.frank.reader.data.LocalBookRepository
import com.frank.reader.data.TranscriptsRepository
import com.frank.reader.data.sample.SampleDataInstaller
import com.frank.reader.player.PlayerController
import com.frank.reader.prefs.ReaderPreferences
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import kotlinx.serialization.json.Json

private val Context.readerPreferencesDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "reader_prefs"
)

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> =
        context.readerPreferencesDataStore

    @Provides
    @Singleton
    fun provideReaderPreferences(dataStore: DataStore<Preferences>): ReaderPreferences =
        ReaderPreferences(dataStore)

    @Provides
    @Singleton
    fun provideSampleDataInstaller(@ApplicationContext context: Context): SampleDataInstaller =
        SampleDataInstaller(context)

    @Provides
    @Singleton
    fun provideRepository(
        @ApplicationContext context: Context,
        json: Json,
        sampleDataInstaller: SampleDataInstaller
    ): TranscriptsRepository = LocalBookRepository(context, json, sampleDataInstaller)

    @Provides
    @Singleton
    fun providePlayerController(@ApplicationContext context: Context): PlayerController =
        PlayerController(context)

    @Provides
    @Singleton
    fun provideWindowInfoTracker(@ApplicationContext context: Context): WindowInfoTracker =
        WindowInfoTracker.getOrCreate(context)
}
