import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './', // 关键：让 assets 路径变成相对路径
  plugins: [react()],
})
