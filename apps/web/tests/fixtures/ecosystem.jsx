// Dev-only browser harness; excluded from Vite production inputs. Real UI,
// gateway router and worker engines, with an explicitly synthetic local account.
import React, {useReducer} from 'react';
import {createRoot} from 'react-dom/client';
import TaskWorkspace from '../../src/workspace/TaskWorkspace.jsx';
import WorkspacePages from '../../src/workspace/WorkspacePages.jsx';
import {newWorkspace, workspaceReducer} from '../../src/workspace/workspaceState.js';
import '../../src/styles.css';
import '../../src/workspace/workspace.css';
import '../../src/workspace/workspacePages.css';
import '../../src/workspace/workspaceMotion.css';
import '../../src/ecosystem/ecosystem.css';
function Harness() {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, () => {
    const initial = newWorkspace('ecosystem-qa');
    initial.tasks[0].branches.png.draft.text = '本地验收草稿：保留四个科研方法节点';
    return initial;
  });
  const account = {user:{id:'ecosystem-qa',name:'本地合成账号'}};
  return <TaskWorkspace state={state} dispatch={dispatch} user={account.user} onSubmit={()=>{}} onFiles={()=>{}} renderPage={(page,onClose,onNavigate,options)=><WorkspacePages {...options} page={page} onClose={onClose} onNavigate={onNavigate} account={account} models={{}}/>}/>;
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')).render(<Harness/>);
