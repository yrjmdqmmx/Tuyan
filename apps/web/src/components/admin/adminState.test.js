import assert from 'node:assert/strict';
import test from 'node:test';
import { adminUrl, queryFor, rangeDates, readAdminLocation } from './adminState.js';
import { isAdminEntry, selectWorkspaceEntry } from '../../lib/adminEntry.js';

test('admin navigation only serializes declared filters and never credentials or section overrides', () => {
  window.history.replaceState({}, '', '/?auth=sign-in&admin=users&a_page=2&a_q=lab&a_section=malicious&a_adminToken=secret');
  assert.deepEqual(readAdminLocation(), { section: 'users', page: '2', q: 'lab' });
  const url = adminUrl({ section: 'jobs', page: 3, userId: 'user-1', id: 'task-1', apiKeys: { openai: 'secret' }, adminToken: 'secret' });
  assert.match(url, /a_page=3/); assert.match(url, /a_userId=user-1/); assert.match(url, /auth=sign-in/);
  assert.doesNotMatch(url, /secret|apiKeys|adminToken/);
  window.history.replaceState({}, '', '/');
});

test('date filters include the selected end day, omit view state, and reject malformed URL dates without crashing', () => {
  const query = queryFor({ section: 'jobs', id: 'task-1', fromDate: '2026-09-01', toDate: '2026-09-07', q: 'lab', page: 2 });
  assert.equal(query.from, new Date('2026-09-01T00:00:00').toISOString());
  assert.equal(query.to, new Date('2026-09-08T00:00:00').toISOString());
  assert.equal(query.page, 2); assert.equal(query.section, undefined); assert.equal(query.id, undefined);
  assert.equal(queryFor({ fromDate: 'bad-date' }).from, 'invalid');
  assert.equal(queryFor({ fromDate: '2026-02-30' }).from, 'invalid');
  assert.deepEqual(rangeDates(7, new Date('2026-09-08T12:00:00')), { fromDate: '2026-09-02', toDate: '2026-09-08' });
});

test('leaving admin removes only admin navigation state and reentry is explicit', () => {
  const calls = [], history = { pushState: (...args) => calls.push(args) };
  selectWorkspaceEntry('generate', { href: 'https://paperbanana.asia/?admin=jobs&a_id=task-1&auth=sign-in' }, history);
  assert.equal(calls[0][2], '/?auth=sign-in');
  selectWorkspaceEntry('admin', { href: 'https://paperbanana.asia/' }, history);
  assert.equal(calls[1][2], '/?admin=overview');
  assert.equal(isAdminEntry('?admin=users'), true);
});
