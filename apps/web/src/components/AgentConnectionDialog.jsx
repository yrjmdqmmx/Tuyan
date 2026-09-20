import { useEffect, useRef, useState } from 'react';
import { Bot, Check, Copy, ExternalLink, X } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';
import { AGENT_CONNECTION_PROMPT, AGENT_INSTALLATION_URL, AGENT_SKILL_URL, AGENT_MCP_URL } from '../lib/agentAccess';

export default function AgentConnectionDialog({ open, onClose }) {
  const [copyState, setCopyState] = useState('idle');
  const promptRef = useRef(null);
  const copyVersion = useRef(0);

  useEffect(() => {
    copyVersion.current += 1;
    setCopyState('idle');
    return () => { copyVersion.current += 1; };
  }, [open]);

  const selectPrompt = () => {
    promptRef.current?.focus({ preventScroll: true });
    promptRef.current?.select();
  };

  const copyPrompt = async () => {
    const version = ++copyVersion.current;
    setCopyState('copying');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(AGENT_CONNECTION_PROMPT);
      if (version === copyVersion.current) setCopyState('copied');
    } catch {
      if (version !== copyVersion.current) return;
      setCopyState('failed');
      selectPrompt();
    }
  };

  const close = () => {
    copyVersion.current += 1;
    onClose();
  };

  return (
    <AccessibleDialog open={open} onClose={close} labelledBy="agent-connection-title" describedBy="agent-connection-description" className="agent-connection-dialog" backdropClassName="agent-connection-backdrop">
      <button type="button" className="agent-connection-close" aria-label="关闭智能体接入" data-autofocus onClick={close}><X size={18} /></button>
      <div className="agent-connection-heading">
        <span className="agent-connection-icon" aria-hidden="true"><Bot size={25} /></span>
        <h2 id="agent-connection-title">连接你的智能体</h2>
      </div>
      <p id="agent-connection-description">复制下方口令，发送给你的 Agent，按提示完成图研接入。</p>
      <label className="agent-prompt-label" htmlFor="agent-connection-prompt">接入口令</label>
      <textarea ref={promptRef} id="agent-connection-prompt" className="agent-connection-prompt" readOnly value={AGENT_CONNECTION_PROMPT} spellCheck={false} />
      <button type="button" className="agent-copy-button" onClick={copyPrompt} disabled={copyState === 'copying'}>
        {copyState === 'copied' ? <Check size={18} /> : <Copy size={18} />}
        {copyState === 'copying' ? '复制中…' : copyState === 'copied' ? '口令已复制' : '复制接入口令'}
      </button>
      <div className="agent-copy-feedback" role="status" aria-live="polite" aria-atomic="true">
        {copyState === 'copied' && '口令已复制，请发送给你的 Agent。配置和验证由 Agent 继续完成。'}
        {copyState === 'failed' && <><span>复制失败，已选中口令，请手动复制。</span><button type="button" className="text-button" onClick={selectPrompt}>选择全部口令</button></>}
        {copyState === 'copying' && '正在复制口令…'}
      </div>
      <div className="agent-capabilities">
        <section><h3>Skill · 本地科研图示工作流</h3><p>组织图示规划、评审与精修，使用 Agent 自有的生图或代码工具；没有生图能力时，可先完成图示规格。</p></section>
        <section><h3>MCP · 只读公共知识</h3><p>读取图研模板、规则与 Schema。</p></section>
      </div>
      <nav className="agent-document-links" aria-label="手动接入文档">
        <a href={AGENT_INSTALLATION_URL} target="_blank" rel="noopener noreferrer">官方接入说明 <ExternalLink size={13} /></a>
        <a href={AGENT_SKILL_URL} target="_blank" rel="noopener noreferrer">Skill 文档 <ExternalLink size={13} /></a>
        <a href={AGENT_MCP_URL} target="_blank" rel="noopener noreferrer">MCP 文档 <ExternalLink size={13} /></a>
      </nav>
    </AccessibleDialog>
  );
}
