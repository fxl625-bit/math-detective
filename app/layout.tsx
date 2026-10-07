import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { PolyfillScript } from "@/components/PolyfillScript";
import OfflineSupport from "@/components/OfflineSupport";
import { APP_VERSION } from "@/lib/appVersion";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "傅星扬的数学侦探",
  description: "面向小学一至六年级的数学学习与应用题理解练习，按年级提供适龄课程，并在本机保存学习进度。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // v2.10.2: Inject build info for runtime proof
  const buildInfoJson = JSON.stringify({
    appVersion: APP_VERSION,
    commitHash: process.env.NEXT_PUBLIC_COMMIT_SHA || 'unknown',
    buildTime: new Date().toISOString(),
  });
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta charSet="utf-8" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__MD_BUILD_INFO__ = ${buildInfoJson};`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#fffdf7]"
      >
        {/* Must be the FIRST child: polyfills execute synchronously during body parsing.
            This is the only reliable way to ensure they run before any async JS bundle. */}
        <PolyfillScript />
        <OfflineSupport compact />
        <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
