import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const POLYFILL_SCRIPT =
  '<script>!function(){' +
  'if(typeof globalThis=="undefined"){' +
  'Object.defineProperty(Object.prototype,"__gt",{get:function(){return this},configurable:!0});' +
  'var g=(function(){return this}).__gt;' +
  'delete Object.prototype.__gt;' +
  'g.globalThis=g' +
  '}' +
  'if(!Object.hasOwn){' +
  'Object.hasOwn=function(o,p){return Object.prototype.hasOwnProperty.call(o,p)}' +
  '}' +
  'window.__earlyErrors=[];' +
  'window.addEventListener("error",function(e){' +
  'window.__earlyErrors.push(e.target===window?' +
  '{type:"js",msg:e.message,line:e.lineno}:' +
  '{type:"load",tag:e.target.tagName,src:e.target.src||e.target.href})' +
  '},!0);' +
  'window.addEventListener("unhandledrejection",function(e){' +
  'window.__earlyErrors.push({type:"promise",reason:String(e.reason)})' +
  '});' +
  '}();</script>';

export async function middleware(_request: NextRequest) {
  const response = await NextResponse.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html') || !response.body) {
    return response;
  }

  // Use web-compatible approach: read all chunks via async iteration
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  } catch (_) {
    return response;
  }

  // Concatenate using TextDecoder
  const decoder = new TextDecoder();
  let html = '';
  for (const chunk of chunks) {
    html += decoder.decode(chunk, { stream: true });
  }
  html += decoder.decode(); // flush

  // Inject polyfill as FIRST element inside <head>
  if (html.includes('<head>')) {
    html = html.replace('<head>', '<head>' + POLYFILL_SCRIPT);
  }

  return new NextResponse(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
