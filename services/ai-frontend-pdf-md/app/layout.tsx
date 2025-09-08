import './globals.css';
import 'katex/dist/katex.min.css';
import { ReactNode } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

export const metadata = {
  title: 'Docs Viewer',
  description: 'Side-by-side PDF and Markdown viewer',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur z-50">
          <a href="/" className="font-semibold">Docs Viewer</a>
          <ThemeToggle />
        </div>
        <main className="p-4">{children}</main>
      </body>
    </html>
  );
}
