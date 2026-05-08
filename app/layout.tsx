import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

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
  description: "小学低年级数学应用题阅读理解小游戏 - 帮助孩子读懂数学应用题",
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
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.__compatErrors = [];
            window.onerror = function(msg, url, line, col, error) {
              window.__compatErrors.push({msg: String(msg), url: String(url||''), line, col, time: Date.now()});
              var el = document.getElementById('__compat-error-display');
              if (!el) {
                el = document.createElement('div');
                el.id = '__compat-error-display';
                el.style.cssText = 'position:fixed;top:0;left:0;right:0;max-height:50vh;overflow:auto;background:#ff4444;color:white;padding:12px;z-index:99999;font-size:12px;white-space:pre-wrap;font-family:monospace;';
                document.body.appendChild(el);
              }
              el.textContent += '\\n' + msg + ' (line ' + line + ')';
            };
            window.addEventListener('unhandledrejection', function(e) {
              window.__compatErrors.push({msg: 'Promise: ' + String(e.reason), time: Date.now()});
            });
          `,
        }} />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#fffdf7]"
      >
        <main className="flex-1 pb-20">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
