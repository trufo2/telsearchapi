import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  // Fix dev-server 403 with symlinked project path by allowing both real and symlink paths
  resolve: {
    preserveSymlinks: true
  },
  server: {
    fs: {
      allow: [
        'D:/js/telsearchapi',          // symlink path
        'D:/documents/js/telsearchapi' // real path
      ]
    }
  }
});
