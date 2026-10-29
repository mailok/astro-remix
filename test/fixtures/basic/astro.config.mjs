import { defineConfig } from 'astro/config';
import remix from 'astro-remix';
import mdx from '@astrojs/mdx';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	integrations: [remix(), mdx()],
	devToolbar: { enabled: false },
	vite: { server: { fs: { allow: [fileURLToPath(new URL('../../../', import.meta.url))] } } },
});
