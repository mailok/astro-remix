import { createElement, ref } from 'remix/component';
import type { Handle } from 'remix/component';

interface StaticHtmlProps {
	value: string;
	name?: string;
}

export default function StaticHtml(handle: Handle<StaticHtmlProps>) {
	let element: Element | undefined;
	let value = handle.props.value;
	const inserted = ref((node) => {
		element = node;
		// Reassigning SSR innerHTML would destroy nested islands and their DOM state.
		if (!node.hasChildNodes()) node.innerHTML = value;
	});

	return () => {
		if (value !== handle.props.value) {
			value = handle.props.value;
			handle.queueTask(() => {
				if (element) element.innerHTML = value;
			});
		}
		return createElement('astro-slot', { name: handle.props.name, mix: inserted });
	};
}
