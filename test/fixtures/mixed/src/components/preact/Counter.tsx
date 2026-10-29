/** @jsxImportSource preact */
import { useState } from 'preact/hooks';
export function Counter() {
  const [count, setCount] = useState(0);
  return <section data-framework="preact"><output>{count}</output><button type="button" onClick={() => setCount(count + 1)}>Increment</button></section>;
}
