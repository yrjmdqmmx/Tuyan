import { useEffect, useMemo, useState } from 'react';

const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', { granularity: 'grapheme' }) : null;
const characters = text => segmenter ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text);
const motionQuery = '(prefers-reduced-motion: reduce)';

function Line({ parts, cursor = false }) {
  return <>{parts.slice(0, -1).join('')}<span className="tw-welcome-tail">{parts.at(-1)}<span className={`tw-welcome-cursor${cursor ? ' is-blinking' : ''}`} /></span></>;
}

function AnimatedWelcome({ messages, stopped, paused }) {
  const [reduced, setReduced] = useState(() => typeof window === 'undefined' || !window.matchMedia || window.matchMedia(motionQuery).matches);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [frame, setFrame] = useState({ index: 0, count: 0, phase: 'typing' });
  const lines = useMemo(() => messages.map(characters), [messages]);
  useEffect(() => {
    const media = window.matchMedia?.(motionQuery);
    if (!media) return;
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (stopped || reduced || paused || hidden) return;
    const length = lines[frame.index].length;
    const previous = lines[frame.index][frame.count - 1];
    const delay = frame.phase === 'holding' ? 3000 : frame.phase === 'waiting' ? 380 : frame.phase === 'deleting' ? 35
      : frame.count === 0 ? 220 : /[，。！？,.!?]/u.test(previous) ? 170 : 80;
    const timer = setTimeout(() => {
      if (frame.phase === 'waiting') {
        // Choose only from the other messages, so consecutive repeats are impossible.
        const index = (frame.index + 1 + Math.floor(Math.random() * (lines.length - 1))) % lines.length;
        setFrame({ index, count: 0, phase: 'typing' });
      } else if (frame.phase === 'holding' || frame.phase === 'deleting') {
        const count = Math.max(0, frame.count - 1);
        setFrame({ ...frame, count, phase: count === 0 ? 'waiting' : 'deleting' });
      } else {
        const count = Math.min(length, frame.count + 1);
        setFrame({ ...frame, count, phase: count === length ? 'holding' : 'typing' });
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [frame, lines, stopped, reduced, paused, hidden]);

  const visible = reduced ? lines[0] : stopped ? lines[frame.index] : lines[frame.index].slice(0, frame.count);
  return <h2 className="tw-welcome-title" aria-label={messages[0]} data-welcome-state={reduced ? 'reduced' : stopped ? 'stopped' : frame.phase} data-welcome-paused={paused || hidden || undefined}>
    {/* Overlapping full lines reserve the maximum wrapped height at the current width. */}
    {lines.map((parts, index) => <span key={index} className="tw-welcome-measure" aria-hidden="true"><Line parts={parts} /></span>)}
    <span className="tw-welcome-visible" aria-hidden="true"><Line parts={visible} cursor={!reduced && !stopped} /></span>
  </h2>;
}

export default function WelcomeTypewriter({ nickname, stopped = false, paused = false }) {
  const messages = useMemo(() => [
    `HI！${nickname?.trim() ? `${nickname.trim()}，` : ''}今天想绘制什么？`,
    '把你的研究想法，变成一张清晰的图。',
    '今天有什么新发现，值得画下来？',
    '从一个想法开始，让研究更直观。',
    '上传一份材料，一起梳理绘图思路。',
  ], [nickname]);
  return <AnimatedWelcome key={messages[0]} messages={messages} stopped={stopped} paused={paused} />;
}
