import React from 'react';
import {createRoot} from 'react-dom/client';
import PlusPanel from '../components/PlusPanel.jsx';
import '../components/plus.css';
const userId=document.getElementById('root').dataset.user;
const role=document.getElementById('root').dataset.role;
const mock=document.getElementById('root').dataset.payment==='mock';
createRoot(document.getElementById('root')).render(<main style={{maxWidth:760,margin:'40px auto',padding:'0 20px',fontFamily:'system-ui'}}><header><h1 style={{fontSize:24}}>图研 · Plus 上线准备</h1><p style={{color:'#617267',fontSize:14}}>{mock?'本地模拟数据 · 不连接支付平台 · 不调用模型':'爱猹收沙箱 · 模拟任务 · 未开放正式收款'}</p></header>{role!=='ordinary'&&<PlusPanel enabled userId={userId}/>}</main>);
