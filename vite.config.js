import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Nama Aplikasi Anda',
        short_name: 'AppReact',
        description: 'Deskripsi aplikasi React saya',
        theme_color: '#ffffff',
        display: 'standalone', // Wajib ada agar bisa di-install
        icons: [
          {
            src: 'icon-192x192.png', // Pastikan file ini ada di folder /public
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png', // Pastikan file ini ada di folder /public
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],// base: '/HRIS-REACT/',
})