"use client";

import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { TailwindIndicator } from "@/components/tailwind-indicator";
import { Toaster } from "@/components/ui/sonner";
import { OpenAPI } from "../client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

OpenAPI.BASE = "http://localhost:25001";
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("access_token") || "";
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  // Create a QueryClient instance
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "font-sans antialiased",
          GeistSans.variable,
          GeistMono.variable
        )}
      >
        <QueryClientProvider client={queryClient}>
          <Toaster position="top-center" />
          <div className="flex flex-col min-h-screen">
            <main className="flex flex-col flex-1 bg-muted/50">{children}</main>
          </div>
          <TailwindIndicator />
        </QueryClientProvider>
      </body>
    </html>
  );
}
