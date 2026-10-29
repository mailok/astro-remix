import type { AstroRenderer } from 'astro';
import { packageName } from './package-name.js';

export function getContainerRenderer(): AstroRenderer {
	return {
		name: packageName,
		clientEntrypoint: `${packageName}/client.js`,
		serverEntrypoint: `${packageName}/server.js`,
	};
}
