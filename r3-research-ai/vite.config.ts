import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Vite runs local FAQ mode; use `vercel dev` when testing API Functions locally.
export default defineConfig({plugins:[react()],server:{port:5173},build:{target:'es2022'}});
