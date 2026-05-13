import { Copy, Gauge, Pause, Play, Trash2 } from 'lucide-react';
import { TRAFFIC_LIMITS } from '../constants';
import { formatCompactNumber } from '../lib/format';

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

function IconButton({ active = false, icon: Icon, label, onClick, tone = 'default' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full border text-slate-100 transition ${
        active
          ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100'
          : tone === 'danger'
            ? 'border-red-300/20 bg-red-400/10 hover:border-red-200/35 hover:bg-red-400/15'
            : 'border-slate-700/80 bg-slate-950/60 hover:border-slate-500/80 hover:bg-slate-900/80'
      }`}
    >
      <Icon size={17} />
    </button>
  );
}

export default function ControlPanel({
  copyFeedback,
  globalRps,
  isRunning,
  onClearBoard,
  onCopyConfig,
  onToggleRunning,
  setGlobalRps,
}) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-4 z-50 w-[min(96vw,1120px)] -translate-x-1/2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[32px] border border-slate-700/80 bg-slate-900/78 px-4 py-3 shadow-2xl shadow-black/35 backdrop-blur-xl md:rounded-full">
        <div className="min-w-0 rounded-full border border-slate-700/70 bg-slate-950/50 px-4 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-200/70">
            ArchitectSim
          </p>
          <p className="font-display text-sm text-white">Canvas Simulator</p>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-3 rounded-full border border-slate-700/70 bg-slate-950/55 px-4 py-2">
            <Gauge size={16} className="text-amber-200" />
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-400">
              Traffic
            </span>
            <input
              className="sim-slider w-28 md:w-44"
              type="range"
              min="0"
              max={SLIDER_STEPS}
              step="1"
              value={getSliderValueFromRps(globalRps)}
              onChange={(event) => setGlobalRps(getRpsFromSliderValue(Number(event.target.value)))}
            />
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
              className="w-24 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-sm text-white outline-none transition focus:border-cyan-300/40 md:w-28"
            />
            <span className="hidden text-sm text-slate-400 md:inline">{formatCompactNumber(globalRps)} req/s</span>
          </div>

          <button
            type="button"
            onClick={onToggleRunning}
            className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
              isRunning
                ? 'border border-red-300/25 bg-red-400/15 text-red-50 hover:bg-red-400/20'
                : 'bg-gradient-to-r from-amber-300 via-amber-200 to-cyan-200 text-slate-950 hover:brightness-105'
            }`}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
            {isRunning ? 'Stop Simulation' : 'Start Simulation'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {copyFeedback ? (
            <span className="hidden rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-100 md:inline-flex">
              Copied
            </span>
          ) : null}
          <IconButton
            icon={Trash2}
            label="Clear Board"
            onClick={onClearBoard}
            tone="danger"
          />
          <IconButton
            active={Boolean(copyFeedback)}
            icon={Copy}
            label="Copy Config"
            onClick={onCopyConfig}
          />
        </div>
      </div>
    </div>
  );
}
