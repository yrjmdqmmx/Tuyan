import React,{useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {WorkspaceHost} from '../workspace/WorkspaceRoot.jsx';
import useWorkspaceNavigation from '../workspace/useWorkspaceNavigation.js';
import '../styles.css';
import '../focus.css';
import '../components/menus.css';
import '../components/figureTypePicker.css';
import '../components/journal-rules.css';
import '../components/workflowOptions.css';
import '../mobile-workbench.css';
const pilotPreview=Boolean(document.getElementById('root').dataset.role);
const userId=document.getElementById('root').dataset.user;
function Preview(){
  const beforeExit=useRef(null),navigation=useWorkspaceNavigation();
  const account={user:{id:userId,name:'Plus 本地验收',email:'plus-preview@example.test'},accountPending:false,onAccountSettings:()=>navigation.navigate('account')};
  return <><div style={{position:'fixed',top:0,left:'50%',transform:'translateX(-50%)',zIndex:1000,padding:'4px 12px',background:'#f7eed8',fontSize:12,borderRadius:'0 0 8px 8px',whiteSpace:'nowrap'}}>本地模拟 · 不调用模型 · 不真实收款</div><WorkspaceHost account={account} beforeExit={beforeExit} preview={!pilotPreview} navigation={navigation}/></>;
}
createRoot(document.getElementById('root')).render(<Preview/>);
