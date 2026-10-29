/** @jsxImportSource solid-js */
import { createSignal } from 'solid-js';
export function Counter() {
  const [count, setCount] = createSignal(0);
  return <section data-framework="solid"><output>{count()}</output><button type="button" onClick={() => setCount(count() + 1)}>Increment</button></section>;
}
