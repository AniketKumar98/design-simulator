import {
  Activity,
  Copy,
  Flame,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { TRAFFIC_LIMITS } from '../constants';
import { formatCompactNumber, formatRps } from '../lib/format';
import CollapsibleSection from './CollapsibleSection';

const LOG_MIN = Math.log10(TRAFFIC_LIMITS.minRps);
const LOG_MAX = Math.log10(TRAFFIC_LIMITS.maxRps);
const LOG_RANGE = Math.max(LOG_MAX - LOG_MIN, 1);
const SLIDER_STEPS = 1000;

function clampTraffic(value) {
  if (!Number.isFinite(value)) {
    return TRAFFIC_LIMITS.defaultRps;
  }

  return Math.min(TRAFFIC_LIMITS.maxRps, Math.max(TRAFFIC_LIMITS.minRps, Math.round(value)));
}

function getSliderValueFromRps(rps) {
  const clampedRps = clampTraffic(rps);
  const normalized = (Math.log10(clampedRps) - LOG_MIN) / LOG_RANGE;
  return Math.round(normalized * SLIDER_STEPS);
}

function getRpsFromSliderValue(sliderValue) {
  const normalized = Math.min(1, Math.max(0, sliderValue / SLIDER_STEPS));
  return clampTraffic(10 ** (LOG_MIN + normalized * LOG_RANGE));
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-slate-950/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-300">{label}</span>
        <div
          className={`flex size-9 items-center justify-center rounded-2xl ${
            tone === 'danger'
              ? 'bg-red-500/15 text-red-300'
              : tone === 'amber'
                ? 'bg-amber-400/15 text-amber-200'
                : 'bg-cyan-400/15 text-cyan-200'
          }`}
        >
          <Icon size={17} />
        </div>
      </div>
      <div className="mt-3 font-display text-3xl text-white">{value}</div>
    </div>
  );
}

export default function ControlPanel({
  analytics,
  canDeleteSelection,
  canDuplicateNode,
  copyFeedback,
  globalRps,
  isRunning,
  onClearBoard,
  onCopyConfig,
  onDeleteSelection,
  onDuplicateNode,
  onResetGraph,
  onToggleRunning,
  selectionLabel,
  setGlobalRps,
  topologyStats,
}) {
  const alertCount = analytics.alerts?.length ?? 0;

  return (
    <section className="glass-panel panel-edge rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-cyan-200/70">
            Control Panel
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">Drive the traffic model</h2>
        </div>
        <div
          className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] ${
            isRunning
              ? 'border border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
              : 'border border-white/10 bg-white/5 text-slate-300'
          }`}
        >
          {isRunning ? 'Running' : 'Idle'}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <CollapsibleSection
          title="Board Actions"
          subtitle="Start, reset, clear, duplicate, or delete without scrolling through the full sidebar."
          meta={selectionLabel ? 'selection active' : 'no selection'}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onToggleRunning}
              className={`flex items-center justify-center gap-2 rounded-[20px] px-4 py-3 font-semibold text-slate-950 transition ${
                isRunning
                  ? 'bg-red-300 hover:bg-red-200'
                  : 'bg-gradient-to-r from-amber-300 via-amber-200 to-cyan-200 hover:brightness-105'
              }`}
            >
              {isRunning ? <Pause size={18} /> : <Play size={18} />}
              {isRunning ? 'Stop Simulation' : 'Start Simulation'}
            </button>

            <button
              type="button"
              onClick={onResetGraph}
              className="flex items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-slate-950/35 px-4 py-3 font-semibold text-white transition hover:border-white/20 hover:bg-slate-900/60"
            >
              <RotateCcw size={18} />
              Load Demo
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={onClearBoard}
              className="flex items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-slate-950/35 px-3 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-slate-900/60"
            >
              <Trash2 size={16} />
              Clear Board
            </button>
            <button
              type="button"
              disabled={!canDeleteSelection}
              onClick={onDeleteSelection}
              className="flex items-center justify-center gap-2 rounded-[18px] border border-red-300/20 bg-red-400/10 px-3 py-3 text-sm font-semibold text-red-100 transition hover:border-red-200/35 hover:bg-red-400/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
            >
              <Trash2 size={16} />
              Delete Selected
            </button>
            <button
              type="button"
              disabled={!canDuplicateNode}
              onClick={onDuplicateNode}
              className="flex items-center justify-center gap-2 rounded-[18px] border border-cyan-300/20 bg-cyan-300/10 px-3 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/35 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
            >
              <Copy size={16} />
              Duplicate Node
            </button>
          </div>

          <p className="mt-3 min-h-5 text-sm text-slate-400">
            {selectionLabel
              ? `Selected: ${selectionLabel}. Press Delete or Backspace to remove it quickly.`
              : 'Select any node or connection to edit or remove it.'}
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          title="Traffic"
          subtitle="Scale the model from smoke tests to multi-billion request volumes."
          meta={formatRps(globalRps)}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-300">Global Traffic</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="font-display text-4xl text-white">{formatCompactNumber(globalRps)}</span>
                <span className="mb-1 text-sm text-slate-400">req/s</span>
              </div>
            </div>
            <Gauge className="text-amber-200" size={22} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px]">
            <div>
              <input
                className="sim-slider w-full"
                type="range"
                min="0"
                max={SLIDER_STEPS}
                step="1"
                value={getSliderValueFromRps(globalRps)}
                onChange={(event) => setGlobalRps(getRpsFromSliderValue(Number(event.target.value)))}
              />
              <div className="mt-2 flex justify-between font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
                <span>{formatCompactNumber(TRAFFIC_LIMITS.minRps)}</span>
                <span>{formatCompactNumber(TRAFFIC_LIMITS.maxRps)}</span>
              </div>
            </div>

            <label className="text-sm text-slate-300">
              Exact RPS
              <input
                type="number"
                min={TRAFFIC_LIMITS.minRps}
                max={TRAFFIC_LIMITS.maxRps}
                step="100"
                value={globalRps}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);

                  if (!Number.isFinite(nextValue)) {
                    return;
                  }

                  setGlobalRps(clampTraffic(nextValue));
                }}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {TRAFFIC_LIMITS.presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setGlobalRps(preset)}
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                  globalRps === preset
                    ? 'border-cyan-200/40 bg-cyan-300/15 text-cyan-100'
                    : 'border-white/10 bg-slate-950/35 text-slate-300 hover:border-white/20 hover:bg-slate-900/55'
                }`}
              >
                {formatCompactNumber(preset)}
              </button>
            ))}
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Use the logarithmic slider for broad jumps, then type an exact value when you want to
            model a known traffic envelope.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          title="Live Metrics"
          subtitle="A compact view of runtime outcomes while the simulation is active."
          meta={isRunning ? 'live' : 'idle'}
          defaultOpen={false}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={Activity}
              label="Successes"
              tone="default"
              value={formatCompactNumber(analytics.successTotal)}
            />
            <StatCard
              icon={Flame}
              label="Failures"
              tone="danger"
              value={formatCompactNumber(analytics.failureTotal)}
            />
            <StatCard
              icon={Gauge}
              label="Avg Latency"
              tone="amber"
              value={`${formatCompactNumber(analytics.avgLatencyMs)} ms`}
            />
          </div>

          <div className="mt-3 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm text-slate-300">Runtime Summary</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {formatRps(analytics.throughputRps)} completing right now across{' '}
              {analytics.bottleneckCount} bottlenecks and {alertCount} active alerts.
            </p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Topology Health"
          subtitle="Use this when the simulation behaves strangely or you want to sanity-check the graph."
          meta={`${topologyStats.warnings.length} warnings`}
          defaultOpen={false}
        >
          <p className="text-sm leading-6 text-slate-400">
            {topologyStats.nodeCount} nodes, {topologyStats.edgeCount} links, {topologyStats.orphanCount}{' '}
            orphaned.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[18px] border border-white/8 bg-white/5 px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Ingress</div>
              <div className="mt-1 font-display text-2xl text-white">{topologyStats.ingressCount}</div>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-white/5 px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Data Stores</div>
              <div className="mt-1 font-display text-2xl text-white">{topologyStats.dataStoreCount}</div>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-white/5 px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Warnings</div>
              <div className="mt-1 font-display text-2xl text-white">{topologyStats.warnings.length}</div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {topologyStats.warnings.length > 0 ? (
              topologyStats.warnings.map((warning) => (
                <div
                  key={warning}
                  className="rounded-[16px] border border-amber-300/15 bg-amber-300/10 px-3 py-2 text-sm text-amber-100"
                >
                  {warning}
                </div>
              ))
            ) : (
              <div className="rounded-[16px] border border-emerald-300/15 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
                Topology is wired up cleanly enough to run realistic traffic experiments.
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Share and Export"
          subtitle="Copy the current graph into a URL so someone else can load the same design."
          defaultOpen={false}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-300">Copy Config</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Export a shareable URL with the current topology encoded directly into it.
              </p>
            </div>
            <button
              type="button"
              onClick={onCopyConfig}
              className="flex shrink-0 items-center gap-2 rounded-[18px] border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/35 hover:bg-cyan-300/15"
            >
              <Copy size={16} />
              Copy Config
            </button>
          </div>
          <p className="mt-3 min-h-6 text-sm text-slate-400">
            {copyFeedback || 'Copy a shareable URL with a Base64-encoded graph snapshot.'}
          </p>
        </CollapsibleSection>
      </div>
    </section>
  );
}
