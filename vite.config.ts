import { defineConfig } from 'vite';

// GitHub Pages project site: https://sarthak-2210.github.io/cosmos/
// For a user site (username.github.io), set base to '/'
export default defineConfig({
  base: '/cosmos/',
  server: {
    host: true,
    port: 5173,
  },
});
