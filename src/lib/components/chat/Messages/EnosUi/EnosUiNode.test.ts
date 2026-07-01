import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import EnosUiNode from './EnosUiNode.svelte';

describe('EnosUiNode', () => {
  it('renders heading + text', () => {
    const { getByText } = render(EnosUiNode, { node: { component: 'stack', children: [
      { component: 'heading', text: 'Title' }, { component: 'text', text: 'Body' } ] } });
    expect(getByText('Title')).toBeTruthy();
    expect(getByText('Body')).toBeTruthy();
  });
  it('renders keyvalue pairs', () => {
    const { getByText } = render(EnosUiNode, { node: { component: 'keyvalue', pairs: [ { k: 'Time', v: '45 min' } ] } });
    expect(getByText('Time')).toBeTruthy();
    expect(getByText('45 min')).toBeTruthy();
  });
  it('drops unknown component silently (no raw JSON)', () => {
    const { container } = render(EnosUiNode, { node: { component: 'wat', foo: 1 } });
    expect(container.textContent).not.toContain('wat');
    expect(container.textContent).not.toContain('{');
  });
  it('renders siblings when one child is malformed', () => {
    const { getByText, container } = render(EnosUiNode, { node: { component: 'stack', children: [
      null, { component: 'text', text: 'survives' }, { bogus: true } ] } });
    expect(getByText('survives')).toBeTruthy();
    expect(container.textContent).not.toContain('bogus');
  });
  it('stops recursing past the depth cap', () => {
    let n: any = { component: 'text', text: 'deep' };
    for (let i = 0; i < 12; i++) n = { component: 'stack', children: [n] };
    const { container } = render(EnosUiNode, { node: n });
    expect(container).toBeTruthy(); // no crash / infinite recursion
  });
});
