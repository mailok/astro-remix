import path from 'node:path';
import remapping from '@jridgewell/remapping';
import MagicString from 'magic-string';
import { transformComponentsForBrowser } from 'remix/component-hmr';
import { createFilter, normalizePath, parseSync, transformWithOxc } from 'vite';
import type { FilterPattern, Plugin } from 'vite';
import { packageName } from './package-name.js';

export interface RemixOptions {
	include?: FilterPattern;
	exclude?: FilterPattern;
}

function markExports(source: string, id: string) {
	const parsed = parseSync(id, source);
	if (parsed.errors.length) return { code: source, map: undefined };
	const output = new MagicString(source);
	const names = new Set<string>();
	for (const statement of parsed.program.body) {
		if (statement.type === 'ExportNamedDeclaration') {
			if (statement.exportKind === 'type') continue;
			const declaration = statement.declaration;
			if (declaration?.type === 'FunctionDeclaration' && declaration.id) {
				if (/^[A-Z]/.test(declaration.id.name)) names.add(declaration.id.name);
			} else if (declaration?.type === 'VariableDeclaration') {
				for (const item of declaration.declarations) {
					if (item.id.type === 'Identifier' && /^[A-Z]/.test(item.id.name)) names.add(item.id.name);
				}
			}
			if (!statement.source) {
				for (const item of statement.specifiers) {
					if (item.exportKind === 'type') continue;
					if (item.local.type === 'Identifier' && /^[A-Z]/.test(item.local.name))
						names.add(item.local.name);
				}
			}
		} else if (statement.type === 'ExportDefaultDeclaration') {
			const declaration = statement.declaration;
			if (declaration.type === 'Identifier') names.add(declaration.name);
			else if (declaration.type === 'FunctionDeclaration' && declaration.id)
				names.add(declaration.id.name);
			else if (declaration.type !== 'ClassDeclaration') {
				const name = '__astroRemixDefault__';
				output.overwrite(statement.start, declaration.start, `const ${name} = `);
				output.appendLeft(statement.end, `; export default ${name};`);
				names.add(name);
			}
		}
	}
	for (const name of names) {
		output.append(
			`\nif (typeof ${name} === 'function') Object.defineProperty(${name}, Symbol.for('astro:renderer'), { value: '${packageName}', configurable: true });`,
		);
	}
	return {
		code: output.toString(),
		map: output.generateMap({ source: id, includeContent: true, hires: true }),
	};
}

export function remixPlugin(options: RemixOptions = {}): Plugin {
	const filter = createFilter(options.include, options.exclude);
	let root = '';
	let base = '/';
	let development = false;
	return {
		name: `${packageName}:jsx`,
		enforce: 'pre',
		configResolved(config) {
			root = config.root;
			base = config.base;
			development = config.command === 'serve';
		},
		configEnvironment(environmentName) {
			return {
				resolve: { dedupe: ['remix', '@remix-run/component'] },
				optimizeDeps: {
					include:
						environmentName === 'client'
							? [
									`${packageName}/client.js`,
									'remix/component',
									'remix/component/jsx-runtime',
									'remix/component/jsx-dev-runtime',
									'remix/component-hmr/runtime/browser',
									'remix/component/dev/refresh',
								]
							: [],
					exclude: [`${packageName}/server.js`, 'remix/component/server'],
				},
			};
		},
		async transform(code, rawId, transformOptions) {
			const [id] = rawId.split('?', 1);
			if (!/\.[jt]sx$/.test(id) || id.includes('/node_modules/') || !filter(id)) return;
			const pragma = /@jsxImportSource\s+(\S+)/.exec(code)?.[1];
			if (pragma && pragma !== 'remix/component') return;
			let source = code;
			let refreshMap: string | null = null;
			// Unsupported module shapes retain Vite's full-reload fallback.
			if (development && !transformOptions?.ssr) {
				const relative = normalizePath(path.relative(root, id));
				const moduleUrl = relative.startsWith('../')
					? `/@fs/${normalizePath(id)}`
					: `${base}${relative}`;
				const refreshed = transformComponentsForBrowser(source, {
					importSource: 'remix',
					moduleUrl,
					sourceMap: true,
				});
				if (refreshed.transformed) {
					source = refreshed.code;
					refreshMap = refreshed.map;
				}
			}
			const marked = markExports(source, id);
			const map =
				marked.map && refreshMap
					? remapping([JSON.parse(marked.map.toString()), JSON.parse(refreshMap)], () => null)
					: marked.map;
			return transformWithOxc(
				marked.code,
				id,
				{
					jsx: { runtime: 'automatic', importSource: 'remix/component', development: false },
					sourcemap: true,
				},
				map,
			);
		},
	};
}
