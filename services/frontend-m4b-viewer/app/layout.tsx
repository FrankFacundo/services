import "../styles/globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
const ThemeToggle = dynamic(() => import("@/components/ThemeToggle"), { ssr: false });
import SidebarTree from "@/components/SidebarTree";

export const metadata: Metadata = {
  title: "M4B Library Browser",
  description: "Browse and play M4B audiobooks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        {/* Set initial theme early to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const s = localStorage.getItem('theme'); const m = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; const d = s ? s === 'dark' : m; document.documentElement.classList.toggle('dark', d); } catch {} })();`,
          }}
        />
        <div className="flex h-screen">
          <aside className="w-72 shrink-0 border-r bg-white overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 border-b flex items-center justify-between dark:border-gray-700">
              <Link href="/" className="font-semibold text-lg">M4B Library</Link>
              <ThemeToggle />
            </div>
            <SidebarTree />
          </aside>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
