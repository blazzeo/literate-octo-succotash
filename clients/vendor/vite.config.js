import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
	base: '/',
	plugins: [react(), tailwindcss()],
	server: {
		host: 'vendor.emarket.com',
		port: 8012,
		cors: {
			origin: [
				'http://localhost:8010',
				'http://localhost:8011',
				'http://localhost:8012',
				'http://localhost:8013'
			],
			credentials: true
		}
	},
})
