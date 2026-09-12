import type { Metadata } from "next";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import "./globals.css";

// Font stacks are defined as system-font fallbacks in globals.css
// (--font-source-serif / --font-inter / --font-plex-mono) rather than
// next/font/google, so the app builds and renders identically without
// a network dependency on fonts.googleapis.com.

export const metadata: Metadata = {
  title: "Docent — Context-Aware AI Document Assistant",
  description:
    "Upload PDF and Markdown documents and ask questions answered with retrieval-augmented generation and cited sources.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
