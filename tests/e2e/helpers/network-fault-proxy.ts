import { createServer, request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface NetworkFaultProxy {
  origin: string;
  setDisconnected(disconnected: boolean): void;
  status(): { disconnected: boolean; forwardedRequests: number; droppedRequestCount: number; droppedRequests: string[] };
  close(): Promise<void>;
}

/**
 * Give a browser context its own same-origin loopback origin and sever only
 * that origin's upstream requests while disconnected. This avoids changing
 * Playwright's browser-wide network emulation or the application server.
 */
export async function createNetworkFaultProxy(upstreamOrigin: string): Promise<NetworkFaultProxy> {
  const upstream = new URL(upstreamOrigin);
  let disconnected = false;
  let forwardedRequests = 0;
  const droppedRequests: string[] = [];

  const server: Server = createServer((incoming, outgoing) => {
    const requestPath = incoming.url || '/';
    if (disconnected) {
      droppedRequests.push(`${incoming.method || 'GET'} ${requestPath}`);
      // A 503 would be a valid HTTP response and would bypass the service
      // worker's fetch rejection handler. Destroy the socket to model a real
      // network failure instead.
      incoming.socket.destroy();
      return;
    }

    forwardedRequests += 1;
    const headers = { ...incoming.headers, host: upstream.host };
    if (typeof headers.origin === 'string' && headers.origin.startsWith(proxyOrigin(server))) {
      headers.origin = upstream.origin;
    }
    if (typeof headers.referer === 'string' && headers.referer.startsWith(proxyOrigin(server))) {
      headers.referer = headers.referer.replace(proxyOrigin(server), upstream.origin);
    }

    const target = new URL(requestPath, upstream);
    const proxyRequest = httpRequest({
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port,
      method: incoming.method,
      path: `${target.pathname}${target.search}`,
      headers,
    }, (upstreamResponse) => {
      const responseHeaders = { ...upstreamResponse.headers };
      const location = responseHeaders.location;
      if (typeof location === 'string' && location.startsWith(upstream.origin)) {
        responseHeaders.location = location.replace(upstream.origin, proxyOrigin(server));
      }
      outgoing.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
      upstreamResponse.pipe(outgoing);
    });

    proxyRequest.on('error', () => {
      if (outgoing.destroyed) return;
      if (!outgoing.headersSent) outgoing.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      outgoing.end('test proxy upstream unavailable');
    });
    incoming.pipe(proxyRequest);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${address.port}`;

  return {
    origin,
    setDisconnected(value) { disconnected = value; },
    status() {
      return {
        disconnected,
        forwardedRequests,
        droppedRequestCount: droppedRequests.length,
        droppedRequests: [...droppedRequests],
      };
    },
    close() {
      return new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}

function proxyOrigin(server: Server): string {
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}
