import { Activity, AlertTriangle, Flame, TimerReset } from 'lucide-react';
import { useState } from 'react';
import { formatCompactNumber } from '../lib/format';

function MetricChip({ icon: Icon, label, tone = 'default', value }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/55 px-3 py-2">
      <Icon
        size={14}
        className={
          tone === 'danger'
            ? 'text-red-300'
            : tone === 'amber'
              ? 'text-amber-200'
              : 'text-emerald-300'
        }
      />
      <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
      <span className="font-display text-sm text-white">{value}</span>
    </div>
  );
}

export default function AnalyticsOverlay({ analytics, isRunning }) {
  const alerts = analytics.alerts ?? [];
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  return (
    <>
      {alerts.length > 0 && isAlertsOpen ? (
        <div className="pointer-events-auto absolute bottom-28 right-4 z-50 w-[min(92vw,380px)] rounded-[28px] border border-slate-700/80 bg-slate-900/88 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 text-sm text-white">
              <AlertTriangle size={15} className="text-amber-200" />
              Active Alerts
            </div>
            <button
              type="button"
              onClick={() => setIsAlertsOpen(false)}
              className="rounded-full border border-slate-700/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-slate-500/80 hover:text-white"
            >
              Hide
            </button>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                className={`rounded-2xl border px-3 py-3 ${
                  alert.severity === 'critical'
                    ? 'border-red-300/20 bg-red-400/10'
                    : 'border-amber-300/20 bg-amber-300/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-sm text-white">{alert.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-200">{alert.detail}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-200">
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-auto absolute bottom-6 left-1/2 z-50 -translate-x-1/2">
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-[28px] border border-slate-700/80 bg-slate-900/78 px-3 py-3 shadow-2xl shadow-black/35 backdrop-blur-xl md:rounded-full">
          <div className="flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/55 px-3 py-2">
            <span className={`h-2.5 w-2.5 rounded-full ${isRunning ? 'bg-emerald-300' : 'bg-slate-500'}`} />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
              {isRunning ? 'Live' : 'Idle'}
            </span>
          </div>

          <MetricChip
            icon={Activity}
            label="Success"
            value={formatCompactNumber(analytics.successTotal)}
          />
          <MetricChip
            icon={Flame}
            label="Failure"
            tone="danger"
            value={formatCompactNumber(analytics.failureTotal)}
          />
          <MetricChip
            icon={TimerReset}
            label="Latency"
            tone="amber"
            value={`${formatCompactNumber(analytics.avgLatencyMs)} ms`}
          />

          {alerts.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsAlertsOpen((current) => !current)}
              className="flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-200/35 hover:bg-amber-300/15"
            >
              <AlertTriangle size={14} />
              {alerts.length} {alerts.length === 1 ? 'Alert' : 'Alerts'}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
