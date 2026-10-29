import { css } from 'remix/component';
import type { Handle } from 'remix/component';
export function RequestCard(handle: Handle<{color: string}>) {
  return () => <p mix={css({ color: handle.props.color })}>{handle.props.color}</p>;
}
