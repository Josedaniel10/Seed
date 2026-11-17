import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateCoverFile, uploadCallCover } from '../coverFiles.ts';

test('covers accept supported raster formats and reject empty, oversized and SVG uploads', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
    assert.doesNotThrow(() => validateCoverFile({ type, size: 3 * 1048576 }));
  }
  for (const file of [{ type: 'image/svg+xml', size: 100 }, { type: 'image/png', size: 0 }, { type: 'image/jpeg', size: 3 * 1048576 + 1 }]) {
    assert.throws(() => validateCoverFile(file), /3 MB/);
  }
});

test('a filename or MIME declaration cannot disguise a non-image upload', async () => {
  for (const [name, type] of [['cover.png', 'image/png'], ['cover.jpg', 'image/jpeg'], ['cover.webp', 'image/webp']]) {
    await assert.rejects(uploadCallCover(new File(['not an image'], name, { type })), /contenido de la imagen/);
  }
});
