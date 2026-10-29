import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { remixPlugin } from '../../dist/vite-plugin.js';

async function transform(code, id = '/app/src/remix/Counter.tsx', options = {}, client = false) {
	const plugin = remixPlugin(options);
	plugin.configResolved({ root: '/app', base: '/', command: client ? 'serve' : 'build' });
	return plugin.transform.call({}, code, id, { ssr: !client });
}

describe('Remix JSX plugin', () => {
	it('compiles and brands named, default and anonymous JSX exports', async () => {
		for (const code of [
			'export function Counter(h) { return () => <p>{h.props.n}</p>; }',
			'export default function Counter(h) { return () => <p>{h.props.n}</p>; }',
			'export default (h) => () => <p>{h.props.n}</p>;',
			'export default function(h) { return () => <p>{h.props.n}</p>; }',
		]) {
			const result = await transform(code);
			assert.match(result.code, /remix\/component\/jsx-runtime/);
			assert.match(result.code, /Symbol\.for\("astro:renderer"\), \{\s*value: "astro-remix"/);
			assert.ok(result.map);
		}
	});
	it('compiles JSX modules requested with a query string', async () => {
		const result = await transform(
			'export function Counter(h) { return () => <p/>; }',
			'/app/src/remix/Counter.tsx?astro-retry=1',
		);
		assert.match(result.code, /remix\/component\/jsx-runtime/);
	});
	it('does not transform Astro virtual scripts, node_modules, or excluded framework files', async () => {
		const code = 'export default () => <p/>;';
		for (const id of [
			'/app/Page.astro?astro&type=script&lang.ts',
			'/app/node_modules/library/Counter.tsx',
			'/app/src/react/Counter.tsx',
		]) {
			assert.equal(await transform(code, id, { include: '**/remix/**' }), undefined);
		}
		assert.equal(await transform('/** @jsxImportSource react */\n' + code), undefined);
	});
	it('uses the upstream HMR transform for supported component exports only in development clients', async () => {
		const code = 'export function Counter(h) { let count = 0; return () => <p>{count}</p>; }';
		assert.match((await transform(code, undefined, {}, true)).code, /import\.meta\.hot/);
		assert.doesNotMatch((await transform(code)).code, /import\.meta\.hot/);
	});
});
