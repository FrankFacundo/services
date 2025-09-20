package com.frank.reader.ui.navigation

import android.net.Uri
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.frank.reader.ui.book.BookDetailRoute
import com.frank.reader.ui.library.LibraryRoute
import com.frank.reader.ui.reader.ReaderRoute

object Destinations {
    const val Library = "library"
    const val Book = "book"
    const val Reader = "reader"

    fun book(bookId: String) = "book/${Uri.encode(bookId)}"
    fun reader(bookId: String, chapterIndex: Int) = "reader/${Uri.encode(bookId)}/$chapterIndex"
}

@Composable
fun ReaderNavGraph(
    windowSizeClass: WindowSizeClass,
    activity: ComponentActivity
) {
    val navController = rememberNavController()
    NavHost(
        navController = navController,
        startDestination = Destinations.Library
    ) {
        composable(Destinations.Library) {
            LibraryRoute(
                windowSizeClass = windowSizeClass,
                activity = activity,
                onBookClick = { bookId -> navController.navigate(Destinations.book(bookId)) },
                onResumeBook = { resume -> navController.navigate(Destinations.reader(resume.bookId, resume.chapterIndex)) }
            )
        }
        composable(
            route = "${Destinations.Book}/{bookId}",
            arguments = listOf(navArgument("bookId") { type = NavType.StringType })
        ) {
            val encodedBookId = it.arguments?.getString("bookId") ?: return@composable
            val bookId = Uri.decode(encodedBookId)
            BookDetailRoute(
                bookId = bookId,
                onNavigateBack = { navController.popBackStack() },
                onOpenReader = { chapterIndex ->
                    Log.d("ReaderNavGraph", "Navigating to reader book=$bookId chapter=$chapterIndex")
                    navController.navigate(Destinations.reader(bookId, chapterIndex))
                }
            )
        }
        composable(
            route = "${Destinations.Reader}/{bookId}/{chapterIndex}",
            arguments = listOf(
                navArgument("bookId") { type = NavType.StringType },
                navArgument("chapterIndex") { type = NavType.IntType }
            )
        ) {
            val encodedBookId = it.arguments?.getString("bookId") ?: return@composable
            val bookId = Uri.decode(encodedBookId)
            val chapterIndex = it.arguments?.getInt("chapterIndex") ?: 0
            Log.d("ReaderNavGraph", "Launching ReaderRoute book=$bookId chapterIndex=$chapterIndex")
            ReaderRoute(
                bookId = bookId,
                windowSizeClass = windowSizeClass,
                activity = activity,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
