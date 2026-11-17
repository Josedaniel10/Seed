import assert from 'node:assert/strict';
import { test, after, afterEach } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { CallCover } = await import('../CallCover.tsx');
let root;
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; document.body.replaceChildren(); });
after(() => dom.window.close());

test('missing and failed covers use the selected icon without a broken image', async () => {
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(createElement(CallCover, { icon_key: 'leaf', accent_color: 'teal' })));
  assert.ok(document.querySelector('.call-cover-fallback svg'));
  await act(async () => root.render(createElement(CallCover, { imageUrl: '/cover.png', icon_key: 'leaf', accent_color: 'teal' })));
  const image = document.querySelector('img');
  assert.equal(image.getAttribute('width'), '960');
  assert.equal(image.getAttribute('height'), '320');
  assert.equal(image.alt, '');
  await act(async () => image.dispatchEvent(new dom.window.Event('error')));
  assert.equal(document.querySelector('img'), null);
  assert.ok(document.querySelector('.call-cover-fallback svg'));
});
