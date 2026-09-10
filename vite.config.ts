import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';

function websocketPlugin(): Plugin {
  const setupWss = (httpServer: any) => {
    if (!httpServer) return;

    const wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (request: any, socket: any, head: any) => {
      if (request.url?.startsWith('/ws')) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    });

    wss.on('connection', (ws: WebSocket) => {
      ws.on('message', (data) => {
        const messageStr = data.toString();
        // Broadcast message to all other connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
          }
        });
      });
    });
  };

  return {
    name: 'vite-websocket-multiplayer',
    configureServer(server) {
      setupWss(server.httpServer);
    },
    configurePreviewServer(server) {
      setupWss(server.httpServer);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), websocketPlugin()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
