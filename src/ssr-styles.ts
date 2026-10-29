import { ELEMENT_NODE, parse, TEXT_NODE } from 'ultrahtml';
import type { DocumentNode, ElementNode } from 'ultrahtml';
import { packageName } from './package-name.js';

/** Unwraps Remix's generated style head without rewriting CSS or component markup. */
export function normalizeSSRStyles(html: string): string {
	if (!html.startsWith('<head>')) return html;
	const document: DocumentNode = parse(html);
	const head = document.children[0] as ElementNode;

	const onlyStyles = head.children.every(
		(node) =>
			(node.type === TEXT_NODE && node.value.trim() === '') ||
			(node.type === ELEMENT_NODE &&
				node.name === 'style' &&
				Object.hasOwn(node.attributes, 'data-rmx-style')),
	);
	if (!onlyStyles) {
		throw new Error(
			`[${packageName}] Islands cannot own document head content. Render titles, metadata, and scripts in an Astro layout instead.`,
		);
	}

	return html.slice(head.loc[0].end, head.loc[1].start) + html.slice(head.loc[1].end);
}
