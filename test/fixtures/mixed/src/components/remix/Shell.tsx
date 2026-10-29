/** @jsxImportSource remix/component */
import { on } from 'remix/component';
import type { Handle, RemixNode } from 'remix/component';

export function Shell(handle: Handle<{children?: RemixNode}>) {
  let count = 0;
  return () => <div data-remix-shell>
    <button type="button" mix={on('click', () => { count++; handle.update(); })}>Shell {count}</button>
    {handle.props.children}
  </div>;
}
