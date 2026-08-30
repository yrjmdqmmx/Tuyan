import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        'not-found': resolve(import.meta.dirname, '404.html'),
        bench: resolve(import.meta.dirname, 'bench/index.html'),
        leaderboard: resolve(import.meta.dirname, 'leaderboard/index.html'),
        'leaderboard-methodology': resolve(import.meta.dirname, 'leaderboard/methodology/index.html'),
        'leaderboard-faithfulness': resolve(import.meta.dirname, 'leaderboard/faithfulness/index.html'),
        'leaderboard-conciseness': resolve(import.meta.dirname, 'leaderboard/conciseness/index.html'),
        'leaderboard-readability': resolve(import.meta.dirname, 'leaderboard/readability/index.html'),
        'leaderboard-aesthetics': resolve(import.meta.dirname, 'leaderboard/aesthetics/index.html'),
        'leaderboard-text-accuracy': resolve(import.meta.dirname, 'leaderboard/text-accuracy/index.html'),
        'leaderboard-topology': resolve(import.meta.dirname, 'leaderboard/topology/index.html'),
        'leaderboard-instruction-adherence': resolve(import.meta.dirname, 'leaderboard/instruction-adherence/index.html'),
        'leaderboard-scientific-faithfulness': resolve(import.meta.dirname, 'leaderboard/scientific-faithfulness/index.html'),
        'leaderboard-structural-topology': resolve(import.meta.dirname, 'leaderboard/structural-topology/index.html'),
        'leaderboard-text-symbol-accuracy': resolve(import.meta.dirname, 'leaderboard/text-symbol-accuracy/index.html'),
        'leaderboard-quantitative-accuracy': resolve(import.meta.dirname, 'leaderboard/quantitative-accuracy/index.html'),
        'leaderboard-readability-visual-hierarchy': resolve(import.meta.dirname, 'leaderboard/readability-visual-hierarchy/index.html'),
        'leaderboard-information-density': resolve(import.meta.dirname, 'leaderboard/information-density/index.html'),
        'leaderboard-publication-aesthetics': resolve(import.meta.dirname, 'leaderboard/publication-aesthetics/index.html'),
        'leaderboard-edit-target-accuracy': resolve(import.meta.dirname, 'leaderboard/edit-target-accuracy/index.html'),
        'leaderboard-non-target-preservation': resolve(import.meta.dirname, 'leaderboard/non-target-preservation/index.html'),
        'leaderboard-submit-prompt': resolve(import.meta.dirname, 'leaderboard/submit-prompt/index.html'),
        'leaderboard-prompt-admin': resolve(import.meta.dirname, 'leaderboard/admin/prompt-submissions/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
  },
});
