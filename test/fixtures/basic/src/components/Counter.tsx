import { css, on } from 'remix/component';
import type { Handle, RemixNode } from 'remix/component';

const styles = css({
	color: 'rgb(102, 51, 153)',
	padding: '16px',
	'&:hover': { color: 'rgb(0, 100, 0)' },
	'@media (max-width: 600px)': { padding: '8px' },
});

export function Counter(handle: Handle<{ name: string; initialCount?: number; children?: RemixNode }>) {
	let count = handle.props.initialCount ?? 0;
	handle.queueTask(() => {
		const status = (window as any).lifecycle ??= { setups: 0, cleanups: 0 };
		status.setups++;
		handle.signal.addEventListener('abort', () => status.cleanups++);
	});
	return () => (
		<section data-counter={handle.props.name} mix={styles}>
			<h2>{handle.props.name}</h2>
			<output>{count}</output>
			<button type="button" mix={on('click', () => { count++; void handle.update(); })}>Increment</button>
			{handle.props.children}
		</section>
	);
}
