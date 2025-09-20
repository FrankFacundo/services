-keep class dagger.hilt.internal.GeneratedComponent { *; }
-keep class * extends dagger.hilt.android.internal.lifecycle.HiltViewModelFactory
-keep class com.frank.reader.** { *; }

-keep class androidx.media3.** { *; }
-keep class kotlinx.serialization.** { *; }

-dontwarn androidx.compose.**
-dontwarn dagger.hilt.**
