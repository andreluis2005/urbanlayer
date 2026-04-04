import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // loadEnv com prefixo '' carrega TODAS as vars (inclusive sem VITE_)
  // Isso permite usar REPLICATE_API_TOKEN no proxy sem expor ao frontend
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        // Proxy seguro: injeta auth header server-side
        // Frontend chama /api/replicate/* SEM token
        // Vite proxy adiciona o token antes de enviar ao Replicate
        '/api/replicate': {
          target: 'https://api.replicate.com',
          changeOrigin: true,
          rewrite: (reqPath) => reqPath.replace(/^\/api\/replicate/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Injeta auth header com token do .env (server-side only)
              const token = env.REPLICATE_API_TOKEN || '';
              if (token) {
                proxyReq.setHeader('Authorization', `Bearer ${token}`);
              }
            });
          },
        },
      },
    },
  };
});
