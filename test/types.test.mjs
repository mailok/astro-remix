import assert from 'node:assert/strict';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { astro, basic } from './helpers.mjs';

describe('Astro component prop types', () => {
	it('checks Handle props with the standard Astro config without rewriting it', async () => {
		const file = new URL('tsconfig.json', basic);
		const before = await readFile(file, 'utf8');
		const config = JSON.parse(before);
		assert.equal(config.extends, 'astro/tsconfigs/strict');
		assert.equal(config.compilerOptions, undefined);
		const { stdout } = await astro(['check'], basic);
		assert.match(stdout, /0 errors/);
		assert.equal(await readFile(file, 'utf8'), before);
	});
	it('checks Remix and the five official frameworks with per-file JSX types', async () => {
		const { stdout } = await astro(['check'], new URL('./fixtures/mixed/', import.meta.url));
		assert.match(stdout, /0 errors/);
	});

	it('rejects incorrect component props instead of erasing their types', async () => {
		const file = new URL('src/pages/type-error.astro', basic);
		try {
			await writeFile(
				file,
				`---\nimport { Counter } from '../components/Counter';\n---\n<Counter client:load name="invalid" initialCount="wrong" />\n`,
				{ flag: 'wx' },
			);
			await assert.rejects(
				() => astro(['check'], basic),
				(error) => {
					assert.match(error.stdout, /not assignable to type 'number/);
					return true;
				},
			);
		} finally {
			await unlink(file);
		}
	});
});
