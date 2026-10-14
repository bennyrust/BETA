import test from 'node:test';
import assert from 'node:assert/strict';
import { splitPosts, greentext } from '../js/post-text.js';

test('blank description lines have no leader', () => {
  for (const line of ['', ' ', '\t']) assert.equal(greentext(line), '');
  assert.equal(greentext('Hello'), '>Hello');
  assert.equal(greentext('>Hello'), '>Hello');
});
test('standalone separators create posts without splitting URLs', () => {
  assert.deepEqual(splitPosts('First\r\n\r\n // \r\nhttps://example.com\nSecond'), [['First', ''], ['https://example.com', 'Second']]);
  assert.deepEqual(splitPosts('First\n//\n//\nLast\n//'), [['First'], ['Last']]);
});
