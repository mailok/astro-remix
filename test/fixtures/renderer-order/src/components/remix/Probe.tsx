/** @jsxImportSource remix/component */
import type { Handle } from 'remix/component';

let foreignSetups = 0;

export function Probe(handle: Handle) {
	if (typeof handle?.update !== 'function') foreignSetups++;
	return () => <p data-foreign-setups={String(foreignSetups)}>Remix</p>;
}
