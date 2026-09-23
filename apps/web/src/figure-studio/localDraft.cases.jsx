import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { createDocument } from '@paperbanana/figure-core';
import { readLocalDraft } from './localDraft.js';
import useLocalDraftSave from './useLocalDraftSave.js';
import LocalSaveNotice from './LocalSaveNotice.jsx';
import { STORAGE_KEY } from './state.js';

afterEach(() => { cleanup(); window.localStorage.clear(); });

function serialLocks() {
  let queue = Promise.resolve();
  return { request(_name, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } };
}
function Harness({ name, locks, onDownload = () => {} }) {
  const [initial] = useState(() => ({ ...readLocalDraft(window.localStorage), locks }));
  const [document, setDocument] = useState(initial.history.document);
  const save = useLocalDraftSave(document, initial);
  return <section aria-label={name}>
    <span>{document.title}</span><p role="status">{save.message}</p>
    <button onClick={() => setDocument(previous => ({ ...previous, title: `${name} edit ${previous.revision + 1}`, revision: previous.revision + 1 }))}>Edit</button>
    <LocalSaveNotice save={save} onSaveSource={() => onDownload(document)} onOpenStored={setDocument} />
  </section>;
}
function storageEvent(key = STORAGE_KEY, storageArea = window.localStorage) {
  fireEvent(window, new window.StorageEvent('storage', { key, storageArea }));
}

test('two mounted tabs retain their own scenes; storage events pause only the stale writer and require explicit adoption', async () => {
  const initial = createDocument({ title: 'Original' });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  const locks = serialLocks(), downloads = [];
  render(<><Harness name="A" locks={locks} /><Harness name="B" locks={locks} onDownload={doc => downloads.push(doc)} /></>);
  const a = within(document.querySelector('[aria-label="A"]')), b = within(document.querySelector('[aria-label="B"]'));
  await waitFor(() => assert.match(b.getByRole('status').textContent, /已保存在/));
  fireEvent.click(a.getByRole('button', { name: 'Edit' }));
  await waitFor(() => assert.equal(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).title, 'A edit 1'));
  storageEvent();
  assert.equal(Boolean(a.queryByRole('alert')), false);
  assert.match(b.getByRole('alert').textContent, /自动保存已暂停/);
  assert.equal(b.getByText('Original').textContent, 'Original');
  fireEvent.click(b.getByRole('button', { name: 'Edit' }));
  await act(async () => {});
  assert.equal(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).title, 'A edit 1');
  assert.equal(b.getByRole('button', { name: '已保存源稿，采用本页' }).disabled, true);
  fireEvent.click(b.getByRole('button', { name: '下载本页源稿' }));
  assert.equal(downloads[0].title, 'B edit 1');
  fireEvent.click(b.getByRole('button', { name: '已保存源稿，采用本页' }));
  await waitFor(() => assert.equal(Boolean(b.queryByRole('alert')), false));
  assert.equal(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).title, 'B edit 1');
  storageEvent();
  assert.match(a.getByRole('alert').textContent, /自动保存已暂停/);
  assert.equal(a.getByText('A edit 1').textContent, 'A edit 1');
});

test('a new local edit or external edit invalidates the downloaded snapshot before either conflict resolution action', async () => {
  const initial = createDocument({ title: 'Original' });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  render(<Harness name="A" locks={serialLocks()} />);
  const ui = within(document.querySelector('[aria-label="A"]'));
  await waitFor(() => assert.match(ui.getByRole('status').textContent, /已保存在/));
  const external = { ...initial, title: 'External' };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(external)); storageEvent();
  fireEvent.click(ui.getByRole('button', { name: '下载本页源稿' }));
  assert.equal(ui.getByRole('button', { name: '已保存源稿，载入本机存档' }).disabled, false);
  fireEvent.click(ui.getByRole('button', { name: 'Edit' }));
  assert.equal(ui.getByRole('button', { name: '已保存源稿，采用本页' }).disabled, true);
  fireEvent.click(ui.getByRole('button', { name: '下载本页源稿' }));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...external, title: 'Newer external' })); storageEvent();
  assert.equal(ui.getByRole('button', { name: '已保存源稿，采用本页' }).disabled, true);
  assert.equal(ui.getByRole('button', { name: '已保存源稿，载入本机存档' }).disabled, true);
  fireEvent.click(ui.getByRole('button', { name: '下载本页源稿' }));
  fireEvent.click(ui.getByRole('button', { name: '已保存源稿，载入本机存档' }));
  await waitFor(() => assert.equal(Boolean(ui.queryByRole('alert')), false));
  assert.equal(ui.getByText('Newer external').textContent, 'Newer external');
  fireEvent.click(ui.getByRole('button', { name: 'Edit' }));
  await waitFor(() => assert.equal(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).title, 'A edit 1'));
});

test('unrelated storage events do not affect autosave, but clearing the draft does', async () => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createDocument()));
  render(<Harness name="A" locks={serialLocks()} />);
  const ui = within(document.querySelector('[aria-label="A"]'));
  await waitFor(() => assert.match(ui.getByRole('status').textContent, /已保存在/));
  storageEvent('other-key'); storageEvent(STORAGE_KEY, window.sessionStorage);
  assert.equal(Boolean(ui.queryByRole('alert')), false);
  window.localStorage.clear(); storageEvent(null);
  assert.match(ui.getByRole('alert').textContent, /自动保存已暂停/);
  assert.equal(window.localStorage.getItem(STORAGE_KEY), null);
});
