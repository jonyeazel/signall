import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Optimo",
  description: "A considered Shopify theme.",
};

// viewport-fit=cover makes env(safe-area-inset-*) meaningful so the mobile
// app-frame clears the notch/home indicator; themeColor matches the backdrop
// gutter so the browser chrome blends into the framed look.
export const viewport: Viewport = {
  themeColor: "#EAEAEA",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "#EAEAEA", color: "#171717" }}
      >
        {children}
      </body>
    </html>
  );
}
