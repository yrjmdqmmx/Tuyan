import WorkspaceDialog from './WorkspaceDialog.jsx';

const tips = [
  ['说明绘图目标', '交代研究主题、图的用途和类型，例如方法流程图、机制示意图或图形摘要。'],
  ['列出关键元素', '写明必须出现的对象、数量和准确名称；重要标签可用引号标出。'],
  ['讲清元素关系', '说明步骤顺序、分组和箭头方向，区分促进、抑制、因果或并列关系。'],
  ['描述布局层级', '指定从左到右、从上到下或分面排列，并说明主体、重点和阅读顺序。'],
  ['约定视觉与文字', '描述配色、背景、图形风格和标签语言；有参考图时说明借鉴它的哪一部分。'],
  ['补充保留与限制', '列出必须保留和避免出现的内容。数值、单位以研究材料为准，缺失信息不要编造。'],
];

export default function WorkspacePromptGuide({ path, returnFocusRef, onClose }) {
  const vector = path === 'svg';
  return <WorkspaceDialog title="提示词建议" className="tw-prompt-guide-dialog" returnFocusRef={returnFocusRef} onClose={onClose}>
    <div className="tw-prompt-guide">
      <div className="tw-prompt-guide-intro">
        <h3>先说清楚画什么，再描述怎么画</h3>
        <p>不必写得很长，把下面与你的图有关的信息补充完整即可。</p>
      </div>
      <ol className="tw-prompt-guide-tips">
        {tips.map(([title, description], index) => <li key={title}>
          <span className="tw-prompt-guide-number" aria-hidden="true">{index + 1}</span>
          <div><h3>{title}</h3><p>{description}</p></div>
        </li>)}
      </ol>
      <section className="tw-prompt-guide-example" aria-label="提示词示例">
        <div className="tw-prompt-guide-example-heading"><h3>试着这样描述</h3><span>{vector ? '矢量绘图示例' : '方法流程图示例'}</span></div>
        <p>为论文的方法部分绘制一张{vector ? '简洁的矢量流程图' : '简洁的科研流程图'}，展示“样本采集 → 质量控制 → 数据分析 → 结果汇总”四个步骤。采用从左到右的布局，每步使用独立的圆角矩形，用单向箭头依次连接。白色背景，以蓝绿色区分步骤，标签使用中文，文字清晰、留白充足。{vector ? '节点、文字和连线分别保留为独立元素。' : ''}不要添加未提供的实验数据、结论或额外步骤。</p>
      </section>
      <p className="tw-prompt-guide-refine"><strong>修改已有图时：</strong>把“需要修改”和“保持不变”的部分分别写清楚，例如“只把蓝色箭头改为深绿色，保留布局、标签和其余配色”。</p>
      <p className="tw-prompt-guide-note">生成后仍需核对科学关系、文字标注和数值；提示词不能替代专业核查。</p>
      <div className="tw-prompt-guide-actions"><button type="button" className="tw-primary" onClick={onClose}>知道了</button></div>
    </div>
  </WorkspaceDialog>;
}
