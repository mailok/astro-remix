import { on } from 'remix/component';
import type { Handle, RemixNode } from 'remix/component';

export function Slots(handle: Handle<{ children?: RemixNode; headerTitle?: RemixNode }>) {
	let count = 0;
	return () => (
		<article data-slot-parent>
			<header>{handle.props.headerTitle}</header>
			<button type="button" mix={on('click', () => { count++; void handle.update(); })}>Parent {count}</button>
			{handle.props.children}
		</article>
	);
}
