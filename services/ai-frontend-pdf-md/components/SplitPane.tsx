"use client";
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export default function SplitPane({ children, leftTitle, rightTitle }: PropsWithChildren<{ leftTitle?: string; rightTitle?: string }>) {
  const [vertical, setVertical] = useState(true); // vertical split side-by-side
  const [ratio, setRatio] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseDown = () => { dragging.current = true; };
  const onMouseUp = () => { dragging.current = false; };
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (vertical) {
      const rel = (e.clientX - rect.left) / rect.width;
      setRatio(Math.min(0.85, Math.max(0.15, rel)));
    } else {
      const rel = (e.clientY - rect.top) / rect.height;
      setRatio(Math.min(0.85, Math.max(0.15, rel)));
    }
  }, [vertical]);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setRatio((r) => Math.max(0.15, r - 0.05));
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setRatio((r) => Math.min(0.85, r + 0.05));
  };

  const [left, right] = Array.isArray(children) ? children : [children, null];

  return (
    <div className="w-full h-[calc(100vh-160px)] border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1.5 text-xs border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
        <div className="text-gray-600 dark:text-gray-300">Layout: {vertical ? 'Side-by-side' : 'Stacked'}</div>
        <button
          onClick={() => setVertical((v) => !v)}
          className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-white/50 dark:hover:bg-gray-700/50"
        >Toggle Layout</button>
      </div>
      <div ref={containerRef} className={clsx('relative w-full h-[calc(100%-32px)]', vertical ? 'flex' : 'block')}
        onMouseLeave={onMouseUp}
      >
        <section className={clsx('overflow-hidden', vertical ? 'h-full' : '')} style={vertical ? { width: `${ratio * 100}%` } : { height: `${ratio * 100}%` }}>
          <div className="px-2 py-1 text-xs border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">{leftTitle}</div>
          {left}
        </section>
        <div
          role="separator"
          aria-label="Resize"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseDown={onMouseDown}
          className={clsx('absolute z-20', vertical ? 'top-0 bottom-0 w-1 cursor-col-resize' : 'left-0 right-0 h-1 cursor-row-resize', 'bg-gray-200/60 dark:bg-gray-700/60 hover:bg-blue-400/60')}
          style={vertical ? { left: `${ratio * 100}%`, transform: 'translateX(-50%)' } : { top: `${ratio * 100}%`, transform: 'translateY(-50%)' }}
        />
        <section className={clsx('absolute right-0 bottom-0 overflow-hidden', vertical ? 'top-0' : 'left-0')} style={vertical ? { left: `${ratio * 100}%` } : { top: `${ratio * 100}%` }}>
          <div className="px-2 py-1 text-xs border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">{rightTitle}</div>
          {right}
        </section>
      </div>
    </div>
  );
}

