import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	base: '/map-tool/',
	build: {
		sourcemap: true, // This should be enabled for the build config
	},
});
