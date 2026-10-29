import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeSSRStyles } from '../../dist/ssr-styles.js';

describe('SSR CSS normalization', () => {
	it('unwraps only the generated head, preserving styles and body byte for byte', () => {
		const css = '<style data-rmx-style="x">@layer rmx.x { .x { color: red } }</style>';
		assert.equal(
			normalizeSSRStyles(`<head>${css}</head><button class="x">Hi</button>`),
			`${css}<button class="x">Hi</button>`,
		);
	});
	it('does not mistake a CSS string for the closing head', () => {
		const css = '<style data-rmx-style="x">.x::before {content:"</head>"}</style>';
		assert.equal(normalizeSSRStyles(`<head>${css}</head><p>Hi</p>`), `${css}<p>Hi</p>`);
	});
	it('preserves nesting, media queries, multiple rules and whitespace', () => {
		const css =
			'\n<style data-rmx-style="a">@media (width < 500px) {.a {&:hover {color:red}}}</style>\n<style data-rmx-style="b">.b{margin:0}</style>';
		assert.equal(normalizeSSRStyles(`<head>${css}</head><p>x</p>`), `${css}<p>x</p>`);
	});
	it('does not rewrite normal fragments or head-like text inside content', () => {
		const html = '<div data-text="&lt;head&gt;">&lt;/head&gt;</div>';
		assert.equal(normalizeSSRStyles(html), html);
		assert.equal(normalizeSSRStyles(''), '');
	});
	it('rejects document metadata rather than silently removing it', () => {
		assert.throws(
			() => normalizeSSRStyles('<head><title>Wrong owner</title></head><p>x</p>'),
			/Astro layout/,
		);
	});
});
