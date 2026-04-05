import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  publicDir: false,
  plugins: [
    react(),
    dts({
      tsconfigPath: 'tsconfig.lib.json',
      insertTypesEntry: true,
    }),
  ],
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@tanstack/react-query',
        'cmdk',
        'lucide-react',
        '@radix-ui/react-popover',
      ],
    },
  },
})
