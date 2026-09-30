import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

function offlineShell() {
  let output;
  return {
    name: 'blip-offline-shell',
    apply: 'build',
    configResolved(config) { output = resolve(config.root, config.build.outDir); },
    async closeBundle() {
      const assets = (await readdir(resolve(output, 'assets'))).filter(name => /\.(js|css|woff2?)$/.test(name)).map(name => `/assets/${name}`);
      const files = ['/offline.html', '/logo-192.png', '/manifest.json', ...assets];
      const hash = createHash('sha256');
      for (const file of files) hash.update(await readFile(resolve(output, file.slice(1))));
      const source = await readFile(resolve(output, 'sw.js'), 'utf8');
      await writeFile(resolve(output, 'sw.js'), source
        .replace("'blip-shell-dev'", JSON.stringify(`blip-shell-${hash.digest('hex').slice(0, 12)}`))
        .replace("['/offline.html', '/logo-192.png']", JSON.stringify(files)));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({

  plugins: [react(), offlineShell()],
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
})
