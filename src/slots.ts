import { createElement } from 'remix/component';
import type { ElementType, RemixNode } from 'remix/component';

export type Props = Record<string, unknown>;
export type Slots = Record<string, string>;
export type RenderSlot = (value: string, name?: string) => RemixNode;

export function createIslandElement(
	Component: ElementType,
	props: Props,
	{ default: children, ...named }: Slots,
	renderSlot: RenderSlot,
) {
	function slot(value: unknown, name?: string) {
		if (value == null || String(value).trim() === '') return undefined;
		return renderSlot(String(value), name);
	}

	const slotProps = Object.fromEntries(
		Object.entries(named).map(([name, value]) => [
			name.trim().replace(/[-_]([a-z])/g, (_, character: string) => character.toUpperCase()),
			slot(value, name),
		]),
	);
	const { children: propChildren, ...componentProps } = props;
	return createElement(
		Component,
		{ ...componentProps, ...slotProps },
		slot(children) ?? (propChildren as RemixNode),
	);
}
