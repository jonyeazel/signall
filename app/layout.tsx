import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The authority voice — a high-contrast optical serif used only for display
// headlines and course titles. Opsz + weight range give editorial control.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "v0University — Master v0 with the #1 builder on Earth",
  description:
    "30,000 generations. #1 on the planet. Micro-courses, prompt libraries, and 1-on-1 access to the alpha v0 user — plus an AI that teaches and answers around the clock.",
};

// viewport-fit=cover makes env(safe-area-inset-*) meaningful so the mobile
// app-frame clears the notch/home indicator; themeColor matches the backdrop
// gutter so the browser chrome blends into the framed look.
export const viewport: Viewport = {
  themeColor: "#F1EFE8",
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
    <html lang="en" className="bg-background">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}
        style={{ background: "#F1EFE8", color: "#16150F" }}
      >
        {children}
      </body>
    </html>
  );
}
