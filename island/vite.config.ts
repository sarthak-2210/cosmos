import { defineConfig } from 'vite';

// GitHub Pages (cosmos monorepo): https://sarthak-2210.github.io/cosmos/island/
export default defineConfig({
  base: '/cosmos/island/',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'esnext',
  },
});
