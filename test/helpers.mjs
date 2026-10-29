import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, symlink } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const require = createRequire(import.meta.url);
const cli = fileURLToPath(
	new URL('./bin/astro.mjs', pathToFileURL(require.resolve('astro/package.json'))),
);

export const basic = new URL('./fixtures/basic/', import.meta.url);
export async function astro(args, root = basic) {
	await mkdir(new URL('node_modules/', root), { recursive: true });
	await symlink(
		fileURLToPath(new URL('../', import.meta.url)),
		new URL('node_modules/astro-remix', root),
		'junction',
	).catch((error) => {
		if (error.code !== 'EEXIST') throw error;
	});
	return exec(process.execPath, [cli, ...args, '--root', fileURLToPath(root)], {
		cwd: fileURLToPath(root),
		env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
		maxBuffer: 4 * 1024 * 1024,
	});
}

export async function start(command, root, port) {
	const { stdout } = await astro(
		[command, '--background', '--host', '127.0.0.1', '--port', String(port)],
		root,
	);
	const url = /http:\/\/127\.0\.0\.1:\d+/.exec(stdout)?.[0];
	if (!url) throw new Error(`No server URL in ${stdout}`);
	return { url, stop: () => astro([command, 'stop'], root) };
}
