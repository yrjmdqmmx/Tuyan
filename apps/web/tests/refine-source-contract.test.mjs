import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/components/RefinePanel.jsx', import.meta.url), 'utf8');

test('refine only accepts an owned result selected inside PaperBanana', () => {
  assert.doesNotMatch(source, /<input[^>]+value=\{sourceUrl\}/u);
  assert.doesNotMatch(source, /https:\/\/\.\.\.|data:image/u);
  assert.match(source, /从“生成结果”或“任务记录”选择本人图片/u);
  assert.match(source, /sourceUrl\s*\?/u);
  assert.match(source, /<img[^>]+src=\{sourceUrl\}/u);
});
