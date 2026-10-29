import type { AstroIntegration } from 'astro';
import { getContainerRenderer } from './container-renderer.js';
import { packageName } from './package-name.js';
import { remixPlugin } from './vite-plugin.js';
import type { RemixOptions } from './vite-plugin.js';

export type { RemixOptions } from './vite-plugin.js';

export default function remix(options: RemixOptions = {}): AstroIntegration {
	return {
		name: packageName,
		hooks: {
			'astro:config:setup': ({ addRenderer, updateConfig }) => {
				addRenderer(getContainerRenderer());
				updateConfig({ vite: { plugins: [remixPlugin(options)] } });
			},
			'astro:config:done': ({ config, logger, injectTypes }) => {
				injectTypes({ filename: 'remix.d.ts', content: `import "${packageName}/astro-types";` });
				const jsx = ['@astrojs/react', '@astrojs/preact', '@astrojs/solid-js'];
				if (
					config.integrations.some((integration) => jsx.includes(integration.name)) &&
					!options.include &&
					!options.exclude
				) {
					logger.warn(
						'More than one JSX renderer is enabled. This will lead to unexpected behavior unless you set the `include` or `exclude` option on Remix and the other JSX integrations.',
					);
				}
			},
		},
	};
}
