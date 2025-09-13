"use client";
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

type Props = PropsWithChildren<{
  leftTitle?: string;
  middleTitle?: string;
  rightTitle?: string;
}>;

export default function TripleSplitPane({ children, leftTitle, middleTitle, rightTitle }: Props) {
  const [vertical, setVertical] = useState(true); // vertical split side-by-side
  const [r1, setR1] = useState(0.33); // ratio of first pane
  const [r2, setR2] = useState(0.34); // ratio of second pane
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<null | 'h1' | 'h2'>(null);

  const min = 0.15; // minimum ratio for any pane

  const onMouseDown1 = () => { dragging.current = 'h1'; };
  const onMouseDown2 = () => { dragging.current = 'h2'; };
  const onMouseUp = () => { dragging.current = null; };

  const clampTriplet = (a: number, b: number) => {
    // Ensures a, b, (1-a-b) each >= min
    let na = a;
    let nb = b;
    const sum = na + nb;
    const maxA = 1 - min - min; // leaving at least min for b and third
    const maxB = 1 - min - min; // leaving at least min for a and third
    na = Math.max(min, Math.min(maxA, na));
    nb = Math.max(min, Math.min(maxB, nb));
    const third = 1 - na - nb;
    if (third < min) {
      // push back against whichever handle is being dragged
      if (dragging.current === 'h1') {
        na = 1 - nb - min;
      } else if (dragging.current === 'h2') {
        nb = 1 - na - min;
      } else {
        // fallback: normalize proportionally
        const total = na + nb;
        na = (na / total) * (1 - min);
        nb = (nb / total) * (1 - min);
      }
    }
    return [na, nb] as const;
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (vertical) {
      const rel = (e.clientX - rect.left) / rect.width; // 0..1
      if (dragging.current === 'h1') {
        const [na, nb] = clampTriplet(rel, r2);
        setR1(na); setR2(nb);
      } else {
        const [na, nb] = clampTriplet(r1, rel - r1);
        setR1(na); setR2(nb);
      }
    } else {
      const rel = (e.clientY - rect.top) / rect.height; // 0..1
      if (dragging.current === 'h1') {
        const [na, nb] = clampTriplet(rel, r2);
        setR1(na); setR2(nb);
      } else {
        const [na, nb] = clampTriplet(r1, rel - r1);
        setR1(na); setR2(nb);
      }
    }
  }, [vertical, r1, r2]);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove]);

  const onKeyDown1 = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const [na, nb] = clampTriplet(r1 - 0.02, r2);
      setR1(na); setR2(nb);
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      const [na, nb] = clampTriplet(r1 + 0.02, r2);
      setR1(na); setR2(nb);
    }
  };
  const onKeyDown2 = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const [na, nb] = clampTriplet(r1, r2 - 0.02);
      setR1(na); setR2(nb);
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      const [na, nb] = clampTriplet(r1, r2 + 0.02);
      setR1(na); setR2(nb);
    }
  };

  const [left, middle, right] = Array.isArray(children) ? (children as any[]) : [children, null, null];

  const styleA = vertical ? { width: `${r1 * 100}%` } : { height: `${r1 * 100}%` };
  const styleBOffset = r1;
  const styleBSize = r2;
  const styleB = vertical ? { left: `${styleBOffset * 100}%`, width: `${styleBSize * 100}%` } : { top: `${styleBOffset * 100}%`, height: `${styleBSize * 100}%` };
  const styleCOffset = r1 + r2;
  const styleC = vertical ? { left: `${styleCOffset * 100}%` } : { top: `${styleCOffset * 100}%` };

  return (
    <div className="w-full h-full min-h-0 border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
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
        {/* Left pane */}
        <section
          className={clsx('overflow-hidden flex flex-col min-h-0', vertical ? 'h-full min-w-0' : '')}
          style={styleA}
        >
          <div className="px-2 py-1 text-xs border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">{leftTitle}</div>
          <div className="flex-1 min-h-0 overflow-hidden">{left}</div>
        </section>

        {/* Handle 1 */}
        <div
          role="separator"
          aria-label="Resize left/middle"
          tabIndex={0}
          onKeyDown={onKeyDown1}
          onMouseDown={onMouseDown1}
          className={clsx('absolute z-20', vertical ? 'top-0 bottom-0 w-1 cursor-col-resize' : 'left-0 right-0 h-1 cursor-row-resize', 'bg-gray-200/60 dark:bg-gray-700/60 hover:bg-blue-400/60')}
          style={vertical ? { left: `${r1 * 100}%`, transform: 'translateX(-50%)' } : { top: `${r1 * 100}%`, transform: 'translateY(-50%)' }}
        />

        {/* Middle pane */}
        <section
          className={clsx('absolute bottom-0 overflow-hidden flex flex-col min-h-0', vertical ? 'top-0 min-w-0' : 'left-0 right-0')}
          style={styleB}
        >
          <div className="px-2 py-1 text-xs border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">{middleTitle}</div>
          <div className="flex-1 min-h-0 overflow-hidden">{middle}</div>
        </section>

        {/* Handle 2 */}
        <div
          role="separator"
          aria-label="Resize middle/right"
          tabIndex={0}
          onKeyDown={onKeyDown2}
          onMouseDown={onMouseDown2}
          className={clsx('absolute z-20', vertical ? 'top-0 bottom-0 w-1 cursor-col-resize' : 'left-0 right-0 h-1 cursor-row-resize', 'bg-gray-200/60 dark:bg-gray-700/60 hover:bg-blue-400/60')}
          style={vertical ? { left: `${(r1 + r2) * 100}%`, transform: 'translateX(-50%)' } : { top: `${(r1 + r2) * 100}%`, transform: 'translateY(-50%)' }}
        />

        {/* Right pane */}
        <section
          className={clsx('absolute right-0 bottom-0 overflow-hidden flex flex-col min-h-0', vertical ? 'top-0 min-w-0' : 'left-0')}
          style={styleC}
        >
          <div className="px-2 py-1 text-xs border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">{rightTitle}</div>
          <div className="flex-1 min-h-0 overflow-hidden">{right}</div>
        </section>
      </div>
    </div>
  );
}

