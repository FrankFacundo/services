import "../styles/globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import SidebarTree from "@/components/SidebarTree";

export const metadata: Metadata = {
  title: "M4B Library Browser",
  description: "Browse and play M4B audiobooks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="flex h-screen">
          <aside className="w-72 shrink-0 border-r bg-white overflow-y-auto">
            <div className="p-4 border-b">
              <Link href="/" className="font-semibold text-lg">M4B Library</Link>
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
