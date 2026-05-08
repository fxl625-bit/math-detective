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
            // Polyfill globalThis for Chrome < 71 (Android 8.0 WebView)
            (function() {
              if (typeof globalThis === 'undefined') {
                Object.defineProperty(Object.prototype, '__globalThisPolyfill__', {
                  get: function() { return this; },
                  configurable: true
                });
                var gt = (function() { return this; }).__globalThisPolyfill__;
                delete Object.prototype.__globalThisPolyfill__;
                gt.globalThis = gt;
              }
            })();
            // Polyfill Object.hasOwn for Chrome < 93 (React 19 dependency)
            if (!Object.hasOwn) {
              Object.hasOwn = function(obj, prop) {
                return Object.prototype.hasOwnProperty.call(obj, prop);
              };
            }
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
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var start = Date.now();
              var el = document.createElement('div');
              el.id = '__hydrate-status';
              el.style.cssText = 'position:fixed;bottom:50px;left:10px;background:rgba(0,0,0,0.85);color:#0f0;padding:6px 12px;border-radius:6px;font-size:11px;z-index:99999;font-family:monospace;max-width:90vw;word-break:break-all;';
              el.textContent = '⏳ 水合准备中…';
              document.body.appendChild(el);

              var logs = [];
              window.__debugLog = function(msg) {
                logs.push(msg);
                el.textContent = '⏳ 等待水合 ' + Math.floor((Date.now()-start)/1000) + 's | ' + logs.slice(-3).join(' | ');
              };

              var timer = setInterval(function() {
                var waited = Math.floor((Date.now() - start) / 1000);
                if (logs.length === 0) {
                  el.textContent = '⏳ 等待水合 ' + waited + 's (无JS日志)';
                }
                if (waited > 15) {
                  el.textContent = '❌ 水合超时 ' + waited + 's | Last: ' + (logs.slice(-3).join(' | ') || '无');
                  el.style.background = 'rgba(200,0,0,0.9)';
                  el.style.color = '#fff';
                  clearInterval(timer);
                }
              }, 2000);

              var observer = new MutationObserver(function() {
                var main = document.querySelector('main');
                if (main && main.textContent && main.textContent.length > 100 && !main.textContent.includes('小侦探正在准备') && !main.textContent.includes('正在加载')) {
                  el.textContent = '✅ 水合完成 (' + Math.floor((Date.now()-start)/1000) + 's)';
                  el.style.background = 'rgba(0,128,0,0.9)';
                  el.style.color = '#fff';
                  setTimeout(function() { el.remove(); }, 2000);
                  observer.disconnect();
                  clearInterval(timer);
                }
              });
              observer.observe(document.querySelector('main') || document.body, { childList: true, subtree: true, characterData: true });
            })();
          `,
        }} />
        <main className="flex-1 pb-20">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
