import { on, type Handle } from 'remix/component';
export function Thrower(handle: Handle) {
  let failed = false;
  return () => {
    if (failed) throw new Error('Remix render failed');
    return <button type="button" mix={on('click', () => { failed = true; handle.update(); })}>Fail render</button>;
  };
}
