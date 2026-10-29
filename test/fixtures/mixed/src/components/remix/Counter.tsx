/** @jsxImportSource remix/component */
import { css, on } from 'remix/component';
import type { Handle } from 'remix/component';

const style = css({ color: 'rgb(102, 51, 153)' });

export function Counter(handle: Handle<{ name?: string }>) {
  let count = 0;
  return () => <section data-framework={handle.props.name ?? 'remix'} mix={style}>
    <output>{count}</output>
    <button type="button" mix={on('click', () => { count++; handle.update(); })}>Increment</button>
  </section>;
}
