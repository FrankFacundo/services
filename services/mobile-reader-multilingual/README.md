# Dual Transcript Reader

An Android (Kotlin, Jetpack Compose) audiobook reader that mirrors ElevenLabs' transcript UX with synchronized dual panes for original and translated text. The app targets local `.m4b` audiobooks, supports foldables, and ships with demo assets so you can experiment immediately.

## Features
- Media3 ExoPlayer playback with frame-accurate seeking and scrub bar.
- Per-chapter transcript + translation parsing (kotlinx.serialization).
- Dual-pane transcript UI: side-by-side on wide/foldable devices, configurable vertical stack or single-pane on phones.
- Active segment highlighting with smooth color animation, auto-centering, and tap-to-seek.
- Translation language switcher, graceful fallback when translations are missing.
- DataStore-backed persistence for last session (book, chapter, position, language).
- File picker to choose the root audiobook folder; demo data bundled in assets.
- Unit tests for binary-search segment lookup and translation matching metrics.
- Instrumentation test that validates tap-to-seek updates highlights.
- StrictMode enabled in debug builds; release build ships with R8/ProGuard.

## Project Structure
- `app/src/main/kotlin` – Application, Hilt modules, repository/domain, Compose UI, view models.
- `app/src/main/assets/sample_book` – Demo audiobook transcripts + translations.
- `app/src/main/res` – Material 3 themes, strings.
- `app/src/test` & `app/src/androidTest` – Unit and instrumentation coverage.
- `proguard-rules.pro` – Shrinker configuration.

## Build & Run
1. Open the project in Android Studio (Giraffe or newer). Gradle sync pulls all dependencies.
2. Use **Run ▶️** to deploy to an emulator (API 24+) or device.
3. On first launch the library view shows the bundled demo book automatically; tap into it to experience the dual transcript reader.

### Pointing to Real Audiobooks
1. Organize filesystem as:
   ```
   root_folder/
     book_name/
       book_name.m4b
       .stt/
         chapter_0.json
         chapter_0.translation-es.json
         ...
   ```
2. From the Library screen press **Choose folder** and select `root_folder` via the system picker (the app persists URI permissions).
3. The scanner infers languages from `translation-<lang>.json` suffixes.

## Testing
- JVM tests: `./gradlew test`
- Instrumentation: `./gradlew connectedAndroidTest` (requires device/emulator, Hilt test runner already configured)

## Handling Large Books
- Parsing occurs on `Dispatchers.IO` with buffered readers to avoid blocking the main thread.
- Segment matching pre-computes translation associations and relies on O(log n) binary search for playback index lookup.
- LazyColumn + throttled auto-scroll keep rendering smooth even with thousands of segments.
- Repository design allows paging or incremental loading if chapters become very large; current implementation reads each chapter on demand.

## Notes & Limitations
- Sample audio is procedurally generated WAV written to `files/` as `sample_chapter.m4b` for demonstration.
- Actual frame precision depends on Media3 sniffed metadata; ensure `.m4b` files include chapter cues if needed.
- Storage access relies on SAF (document tree); if your files reside on removable storage, grant read permissions via picker.
- Additional translations per language are loaded eagerly per chapter; consider caching or streaming if you host very large translations.
