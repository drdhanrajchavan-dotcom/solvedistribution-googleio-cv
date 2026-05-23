import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import discoverHandler from './api/discover' // We will modify api/discover to work with this

// A simple Vite plugin to serve our Vercel-like API route during local dev
const apiPlugin = () => ({
  name: 'api-plugin',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === '/api/discover' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => body += chunk);
        req.on('end', () => {
          try {
            req.body = JSON.parse(body);
          } catch(e) {}
          // Mock res.json and res.status for the handler
          res.status = (code: number) => { res.statusCode = code; return res; };
          res.json = (data: any) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
          discoverHandler(req, res);
        });
      } else {
        next();
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiPlugin()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
