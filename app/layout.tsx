import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND } from "../lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.description,
};

// viewport-fit=cover makes env(safe-area-inset-*) meaningful so the mobile
// app-frame clears the notch/home indicator; themeColor matches the page so the
// browser chrome disappears into it.
export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // On supporting browsers (Android Chrome) the keyboard resizes the layout
  // viewport, so bottom-anchored UI stays above it natively. iOS/WebKit is
  // handled in-app via the visualViewport keyboard offset in the chat drawer.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Background and text colour live in globals.css so there is exactly one
          source of truth — an inline style here would silently outrank it. */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
