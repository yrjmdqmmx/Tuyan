import { useState } from 'react';
import AccessibleDialog from '../components/AccessibleDialog.jsx';
import AuthPanel from '../components/AuthPanel.jsx';
import TaskWorkspace from './TaskWorkspace.jsx';
import { newWorkspace } from './workspaceState.js';

const noop = () => {};

export default function WorkspaceLogin({ pending, client, watcha, onAuthenticated }) {
  // A fresh presentation only: never mount the account's stores or execution hooks.
  const [background] = useState(() => newWorkspace('login-background'));
  return <div className="tw-login-required">
    <div className="tw-login-background" inert aria-hidden="true">
      <TaskWorkspace state={background} dispatch={noop} onSubmit={noop} onFiles={noop} presentationOnly />
    </div>
    <AccessibleDialog open onClose={noop} labelledBy="tw-required-login-title" backdropClassName="tw-auth-backdrop tw-required-login-backdrop" className="tw-auth-dialog tw-required-login-dialog">
      <h2 className="tw-sr" id="tw-required-login-title">登录图研</h2>
      {pending ? <p className="tw-login-pending" role="status">正在确认登录状态…</p> : <AuthPanel client={client} watcha={watcha} onAuthenticated={onAuthenticated} />}
    </AccessibleDialog>
  </div>;
}
