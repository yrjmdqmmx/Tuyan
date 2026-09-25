import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useAuthSession } from './useAuthSession.js';

afterEach(cleanup);
const session = (id) => ({ user: { id, email: `${id}@example.com` } });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function Probe({ options, capture }) {
  const auth = useAuthSession(options); capture(auth);
  return <output aria-label="auth state">{auth.isPending ? 'pending' : auth.session?.user?.id || 'anonymous'}:{auth.generation}:{auth.error?.message || ''}</output>;
}

test('clear invalidates the initial request before a late signed-in response can be applied', async () => {
  const response = deferred(); let auth; let calls = 0;
  render(<Probe options={{ authEnabled: true, client: { getSession: () => { calls++; return response.promise; } } }} capture={(value) => { auth = value; }} />);
  const requested = auth.generation;
  act(() => auth.clear());
  assert.ok(auth.generation > requested); assert.equal(auth.isCurrentGeneration(requested), false);
  await act(async () => { response.resolve({ data: session('late'), error: null }); await response.promise; });
  assert.equal(auth.session, null); assert.equal(auth.isPending, false); assert.equal(calls, 1);
});

test('overlapping refreshes accept only the newest request, including stale errors', async () => {
  const first = deferred(), second = deferred(); let calls = 0; let auth; let oldPromise; let newPromise;
  const client = { getSession: () => (++calls === 1 ? first.promise : second.promise) };
  render(<Probe options={{ authEnabled: true, initialSession: session('original'), client }} capture={(value) => { auth = value; }} />);
  act(() => { oldPromise = auth.refresh(); });
  assert.equal(auth.session, null); assert.equal(auth.isPending, true);
  const olderGeneration = auth.generation;
  act(() => { newPromise = auth.refresh(); });
  await act(async () => { second.resolve({ data: session('newest'), error: null }); await newPromise; });
  await act(async () => { first.reject(new Error('old failure')); await oldPromise; });
  assert.equal(auth.session.user.id, 'newest'); assert.equal(auth.error, null); assert.equal(auth.isPending, false);
  assert.equal(auth.isCurrentGeneration(olderGeneration), false); assert.equal(await oldPromise, null);
});

test('signOut clears immediately and ignores both stale refresh and late signout error after a new session', async () => {
  const oldRefresh = deferred(), signout = deferred(); let calls = 0; let auth; let pendingRefresh; let pendingSignout;
  const client = { getSession: () => ++calls === 1 ? oldRefresh.promise : Promise.resolve({ data: session('second'), error: null }), signOut: () => signout.promise };
  render(<Probe options={{ authEnabled: true, initialSession: session('first'), client }} capture={(value) => { auth = value; }} />);
  act(() => { pendingRefresh = auth.refresh(); });
  act(() => { pendingSignout = auth.signOut(); });
  assert.equal(auth.session, null); assert.equal(auth.isPending, false);
  await act(async () => { oldRefresh.resolve({ data: session('first'), error: null }); await pendingRefresh; });
  assert.equal(auth.session, null);
  await act(async () => { await auth.refresh(); });
  assert.equal(auth.session.user.id, 'second');
  await act(async () => { signout.reject(new Error('late signout error')); await pendingSignout; });
  assert.equal(auth.session.user.id, 'second'); assert.equal(auth.error, null);
});

test('initial network rejection and API errors settle pending state without unhandled promises', async () => {
  let auth; let calls = 0;
  const client = { getSession: async () => { if (++calls === 1) throw new Error('session unavailable'); return { data: session('must-not-appear'), error: { message: 'session rejected' } }; } };
  render(<Probe options={{ authEnabled: true, client }} capture={(value) => { auth = value; }} />);
  await waitFor(() => assert.equal(auth.isPending, false));
  assert.equal(auth.session, null); assert.equal(auth.error.message, 'session unavailable');
  await act(async () => { assert.equal(await auth.refresh(), null); });
  assert.equal(auth.session, null); assert.equal(auth.error.message, 'session rejected');
});

test('disabled authentication never queries a session and unmount invalidates an in-flight request', async () => {
  let calls = 0; let auth;
  const view = render(<Probe options={{ authEnabled: false, client: { getSession: () => { calls++; } } }} capture={(value) => { auth = value; }} />);
  assert.equal(auth.isPending, false); assert.equal(calls, 0); view.unmount();
  const response = deferred();
  const pending = render(<Probe options={{ authEnabled: true, client: { getSession: () => response.promise } }} capture={(value) => { auth = value; }} />);
  const generation = auth.generation; pending.unmount();
  await act(async () => { response.resolve({ data: session('late'), error: null }); await response.promise; });
  assert.equal(auth.isCurrentGeneration(generation), false);
  assert.equal(screen.queryByLabelText('auth state'), null);
});
