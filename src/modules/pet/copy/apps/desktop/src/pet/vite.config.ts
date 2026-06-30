import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const ROOT = path.resolve(__dirname, '../../../../../../../../../..')

function resolveReactModule(modulePath: string): string {
  const envRoot = process.env.HERMES_AGENT_ROOT
  if (envRoot) {
    return path.join(envRoot, 'node_modules', modulePath)
  }
  const candidates = [
    path.join(ROOT, 'dist', 'hermes-agent', 'node_modules', modulePath),
    path.join(ROOT, 'node_modules', modulePath),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return candidates[0]
}

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../../dist-built'),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'pet.js',
        chunkFileNames: 'pet-[name].js',
        assetFileNames: 'pet-[name].[ext]',
      },
    },
    cssCodeSplit: false,
    sourcemap: false,
  },
  resolve: {
    alias: {
      react: resolveReactModule('react'),
      'react-dom': resolveReactModule('react-dom'),
      'react-dom/client': resolveReactModule(path.join('react-dom', 'client')),
      'react/jsx-runtime': resolveReactModule(path.join('react', 'jsx-runtime.js')),
    },
  },
})
