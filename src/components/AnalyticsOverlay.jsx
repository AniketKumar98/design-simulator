import { Activity, AlertTriangle, Flame, TimerReset } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatCompactNumber, formatRps } from '../lib/format';

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

function Metric({ icon: Icon, label, tone, value }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-slate-950/35 p-3">
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

function TabButton({ active, count, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
        active
          ? 'border-cyan-200/40 bg-cyan-300/15 text-cyan-100'
          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      <span>{label}</span>
      {typeof count === 'number' ? (
        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default function AnalyticsOverlay({ analytics, history, isRunning }) {
  const [activeTab, setActiveTab] = useState('trends');
  const alerts = analytics.alerts ?? [];

  const successSeries = history.map((point) => point.success);
  const failureSeries = history.map((point) => point.failure);
  const maxValue = Math.max(1, ...successSeries, ...failureSeries);
  const width = 520;
  const height = 112;
  const padding = 14;
  const successLine = buildLine(successSeries, width, height, padding, maxValue);
  const failureLine = buildLine(failureSeries, width, height, padding, maxValue);
  const hasHistory = successSeries.length > 0;

  useEffect(() => {
    if (alerts.length > 0) {
      setActiveTab((currentTab) => (currentTab === 'trends' ? 'alerts' : currentTab));
    }
  }, [alerts.length]);

  if (!isRunning) {
    return null;
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/72 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-stretch">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">
                Real-Time Analytics
              </p>
              <h3 className="mt-1 font-display text-xl text-white">Bottom dock for live runs</h3>
            </div>
            <div className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-200">
              Live
            </div>
          </div>

          <div className="mt-4 grid gap-3 grid-cols-3 lg:grid-cols-1">
            <Metric icon={Activity} label="Success" value={formatCompactNumber(analytics.successTotal)} />
            <Metric icon={Flame} label="Failure" tone="danger" value={formatCompactNumber(analytics.failureTotal)} />
            <Metric
              icon={TimerReset}
              label="Latency"
              tone="amber"
              value={`${formatCompactNumber(analytics.avgLatencyMs)} ms`}
            />
          </div>

          <div className="mt-3 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              <AlertTriangle size={14} className={alerts.length > 0 ? 'text-amber-200' : 'text-emerald-200'} />
              <span>Active Alerts</span>
            </div>
            <div className="mt-2 font-display text-3xl text-white">{alerts.length}</div>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {alerts.length > 0
                ? alerts[0].title
                : 'No active failure alerts right now. The runtime looks healthy.'}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[20px] border border-white/10 bg-slate-900/55">
          <div className="flex flex-col gap-3 border-b border-white/8 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-300">Runtime detail</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {formatRps(analytics.throughputRps)} traced throughput
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TabButton
                active={activeTab === 'trends'}
                label="Trends"
                onClick={() => setActiveTab('trends')}
              />
              <TabButton
                active={activeTab === 'alerts'}
                count={alerts.length}
                label="Alerts"
                onClick={() => setActiveTab('alerts')}
              />
            </div>
          </div>
          <div className="p-4">
            {activeTab === 'trends' ? (
              <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full">
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
                      strokeWidth="2.4"
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
                    Live metrics will appear as traffic moves through the graph
                  </text>
                )}
              </svg>
            ) : alerts.length > 0 ? (
              <div className="max-h-44 space-y-3 overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-[18px] border px-4 py-3 ${
                      alert.severity === 'critical'
                        ? 'border-red-300/20 bg-red-400/10'
                        : 'border-amber-300/20 bg-amber-300/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-base text-white">{alert.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-200">{alert.detail}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                          alert.severity === 'critical'
                            ? 'border border-red-300/25 bg-red-400/10 text-red-100'
                            : 'border border-amber-300/25 bg-amber-300/10 text-amber-100'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-36 items-center justify-center rounded-[18px] border border-emerald-300/15 bg-emerald-300/10 px-4 text-center text-sm leading-6 text-emerald-100">
                Traffic is flowing cleanly. Alerts will appear here when a node starts dropping
                requests or exceeds its capacity ceiling.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
