import { BookOpen, ExternalLink } from 'lucide-react';

export default function ApiKeyGuide({ providerConfig, recoverable = false }) {
  return (
    <div className="api-key-guide">
      <div className="api-key-guide-head">
        <BookOpen size={16} />
        <span>API Key 申请指南</span>
      </div>
      <ol>
        {providerConfig.guideSteps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <a href={providerConfig.guideUrl} target="_blank" rel="noreferrer">
        打开 {providerConfig.label} 官方申请/说明页面
        <ExternalLink size={14} />
      </a>
      <p className="api-key-guide-note">{recoverable ? '密钥只用于该任务及其恢复，加密保存至任务完成或过期。' : '密钥只用于本次任务调用模型，不会保存到本站数据库。'}</p>
    </div>
  );
}
