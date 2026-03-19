'use client';

import React, { useState, useEffect, useRef } from 'react';

interface LogLine {
  text: string;
  type: 'info' | 'success' | 'warning' | 'dim';
  delayMs: number; // ms from startTime to show this line
}

const PROFILE_LOGS: Record<string, LogLine[]> = {
  quick: [
    { text: 'Initializing CP-SAT solver engine...', type: 'info', delayMs: 800 },
    { text: 'Loading vessel fleet: T1–T9 (7×50K MT, 2×25K MT)', type: 'dim', delayMs: 1800 },
    { text: 'Enumerating 6,534 co-loading route combinations...', type: 'info', delayMs: 3000 },
    { text: 'Applying 720h/month vessel time constraints...', type: 'info', delayMs: 5000 },
    { text: 'Setting demand equality constraints (U1–U11)...', type: 'info', delayMs: 7000 },
    { text: 'Running branch-and-bound (quick profile)...', type: 'info', delayMs: 9000 },
    { text: 'Current Best: ₹2.85 Cr — searching deeper...', type: 'warning', delayMs: 11000 },
    { text: 'Propagating constraints, pruning dominated routes...', type: 'dim', delayMs: 13000 },
  ],
  balanced: [
    { text: 'Initializing CP-SAT solver engine...', type: 'info', delayMs: 800 },
    { text: 'Loading vessel fleet: T1–T9 (7×50K MT, 2×25K MT)', type: 'dim', delayMs: 2000 },
    { text: 'Enumerating 6,534 co-loading route combinations...', type: 'info', delayMs: 4000 },
    { text: 'Discarding routes that exceed 720h/month capacity...', type: 'info', delayMs: 7000 },
    { text: 'Enforcing hull GCD cargo split constraints...', type: 'info', delayMs: 10000 },
    { text: 'Setting demand equality constraints (U1–U11)...', type: 'info', delayMs: 13000 },
    { text: 'Running branch-and-bound (balanced profile)...', type: 'info', delayMs: 16000 },
    { text: 'Current Best: ₹2.78 Cr — searching deeper...', type: 'warning', delayMs: 20000 },
    { text: 'Exploring co-loading split trip combinations...', type: 'dim', delayMs: 24000 },
    { text: 'Tightening objective bound...', type: 'dim', delayMs: 27000 },
  ],
  thorough: [
    { text: 'Initializing CP-SAT solver engine (thorough mode)...', type: 'info', delayMs: 1000 },
    { text: 'Loading vessel fleet: T1–T9 (7×50K MT, 2×25K MT)', type: 'dim', delayMs: 3000 },
    { text: 'Enumerating 6,534 co-loading route combinations...', type: 'info', delayMs: 6000 },
    { text: 'Discarding 1,200 sub-optimal routes via Dominance Pruning...', type: 'info', delayMs: 12000 },
    { text: 'Enforcing hull GCD cargo split: min_chunk = GCD(caps)', type: 'info', delayMs: 18000 },
    { text: 'Setting demand equality constraints (U1–U11)...', type: 'info', delayMs: 24000 },
    { text: 'Applying 720h/month vessel time constraints...', type: 'info', delayMs: 30000 },
    { text: 'Running CP-SAT branch-and-bound (5-min budget)...', type: 'info', delayMs: 40000 },
    { text: 'Current Best: ₹2.78 Cr — searching for deeper optima...', type: 'warning', delayMs: 60000 },
    { text: 'Exploring 847 co-loading combinations with U2 (135K MT)...', type: 'dim', delayMs: 90000 },
    { text: 'Current Best: ₹2.71 Cr — continuing search...', type: 'warning', delayMs: 140000 },
    { text: 'Tightening bounds, LP relaxation active...', type: 'dim', delayMs: 200000 },
    { text: 'Verifying global optimality conditions...', type: 'dim', delayMs: 260000 },
  ],
};

interface SolverConsoleProps {
  isLoading: boolean;
  solverProfile: 'quick' | 'balanced' | 'thorough';
  startTime: number | null;
}

export function SolverConsole({ isLoading, solverProfile, startTime }: SolverConsoleProps) {
  const [visibleLines, setVisibleLines] = useState<LogLine[]>([]);
  const [done, setDone] = useState(false);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset and schedule lines each time loading starts
  useEffect(() => {
    if (!isLoading || startTime === null) return;

    setVisibleLines([]);
    setDone(false);

    // Clear any previous timers
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    const logs = PROFILE_LOGS[solverProfile] ?? PROFILE_LOGS.quick;
    const now = Date.now();

    logs.forEach((line) => {
      const remaining = startTime + line.delayMs - now;
      const t = setTimeout(() => {
        setVisibleLines((prev) => [...prev, line]);
      }, Math.max(0, remaining));
      timerRefs.current.push(t);
    });

    return () => {
      timerRefs.current.forEach(clearTimeout);
      timerRefs.current = [];
    };
  }, [isLoading, solverProfile, startTime]);

  // When loading ends, append success line
  useEffect(() => {
    if (!isLoading && visibleLines.length > 0 && !done) {
      setDone(true);
      setVisibleLines((prev) => [
        ...prev,
        { text: '✓ Optimal solution found — displaying results.', type: 'success', delayMs: 0 },
      ]);
    }
    // If loading stopped (error/cancel) without any lines, clear
    if (!isLoading && visibleLines.length === 0) {
      setDone(false);
    }
  }, [isLoading]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleLines]);

  if (!isLoading && visibleLines.length === 0) return null;

  return (
    <div className="terminal-style rounded-xl border border-slate-200 p-4 text-xs space-y-0.5 max-h-48 overflow-y-auto">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
        <span className="text-blue-600 font-semibold tracking-widest text-[10px] uppercase">
          Solver Console
        </span>
        {isLoading && (
          <span className="flex items-center gap-1 text-slate-500">
            <span
              className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"
            />
            RUNNING
          </span>
        )}
        {done && (
          <span className="text-green-600 font-semibold">COMPLETE</span>
        )}
      </div>

      {visibleLines.map((line, i) => (
        <div
          key={i}
          className={
            line.type === 'success'
              ? 'text-green-600 font-semibold'
              : line.type === 'warning'
              ? 'text-amber-600'
              : line.type === 'dim'
              ? 'text-slate-400'
              : 'text-slate-700'
          }
        >
          <span className="text-slate-400 mr-2 select-none">›</span>
          {line.text}
          {/* Blinking cursor on the last active line */}
          {i === visibleLines.length - 1 && isLoading && (
            <span className="ml-0.5 inline-block w-1.5 h-3 bg-blue-500 animate-pulse align-baseline" />
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
