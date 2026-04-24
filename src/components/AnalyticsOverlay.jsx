import { Activity, Flame, TimerReset } from 'lucide-react';

function buildLine(values, width, height, padding, maxValue) {
  if (values.length === 0) {
    return '';
  }

  return values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
      const y = height - padding - (value / Math.max(maxValue, 1)) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
        <Icon
          size={14}
          className={tone === 'danger' ? 'text-red-300' : tone === 'amber' ? 'text-amber-200' : 'text-cyan-200'}
        />
        <span>{label}</span>
      </div>
      <div className="mt-2 font-display text-2xl text-white">{value}</div>
    </div>
  );
}

export default function AnalyticsOverlay({ analytics, history, isRunning }) {
  const successSeries = history.map((point) => point.success);
  const failureSeries = history.map((point) => point.failure);
  const maxValue = Math.max(1, ...successSeries, ...failureSeries);
  const width = 308;
  const height = 164;
  const padding = 18;
  const successLine = buildLine(successSeries, width, height, padding, maxValue);
  const failureLine = buildLine(failureSeries, width, height, padding, maxValue);
  const hasHistory = successSeries.length > 0;

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-20 w-[340px] max-w-[calc(100%-2rem)] rounded-[26px] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">
            Real-Time Analytics
          </p>
          <h3 className="mt-1 font-display text-xl text-white">
            Success vs failure trajectory
          </h3>
        </div>
        <div
          className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] ${
            isRunning
              ? 'border border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
              : 'border border-white/10 bg-white/5 text-slate-400'
          }`}
        >
          {isRunning ? 'Live' : 'Paused'}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric icon={Activity} label="Success" value={analytics.successTotal.toFixed(1)} />
        <Metric icon={Flame} label="Failure" tone="danger" value={analytics.failureTotal.toFixed(1)} />
        <Metric
          icon={TimerReset}
          label="Latency"
          tone="amber"
          value={`${analytics.avgLatencyMs.toFixed(0)} ms`}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-slate-900/55">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
          <defs>
            <linearGradient id="successFill" x1="0" x2="1">
              <stop offset="0%" stopColor="rgba(93, 226, 231, 0.12)" />
              <stop offset="100%" stopColor="rgba(93, 226, 231, 0)" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((mark) => (
            <line
              key={mark}
              x1={padding}
              x2={width - padding}
              y1={padding + mark * (height - padding * 2)}
              y2={padding + mark * (height - padding * 2)}
              stroke="rgba(186, 219, 213, 0.08)"
              strokeDasharray="4 6"
            />
          ))}
          {hasHistory ? (
            <>
              <path
                d={`${successLine} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
                fill="url(#successFill)"
              />
              <path
                d={successLine}
                fill="none"
                stroke="#5de2e7"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d={failureLine}
                fill="none"
                stroke="#ff7557"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeDasharray="6 10"
              />
            </>
          ) : (
            <text
              x="50%"
              y="50%"
              fill="rgba(186, 219, 213, 0.54)"
              fontSize="13"
              textAnchor="middle"
            >
              Start the simulation to trace live outcomes
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
