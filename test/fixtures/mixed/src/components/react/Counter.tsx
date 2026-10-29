import { useState, type ReactNode } from 'react';
export function Counter() {
  const [count, setCount] = useState(0);
  return <section data-framework="react"><output>{count}</output><button type="button" onClick={() => setCount(count + 1)}>Increment</button></section>;
}
export function Shell({ children }: { children?: ReactNode }) { return <div data-react-shell>{children}</div>; }
