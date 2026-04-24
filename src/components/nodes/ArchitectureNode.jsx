import { Flame } from 'lucide-react';
import { Handle, Position } from '@xyflow/react';
import {
  COMPONENT_REGISTRY,
  getTrafficPatternLabel,
  NODE_KINDS,
} from '../../constants';
import { formatCompactNumber, formatPercent, formatRps } from '../../lib/format';

function getFacts(data, simulation) {
  const config = data.config;

  switch (data.kind) {
    case NODE_KINDS.CLIENT:
      return [
        { label: 'Pattern', value: getTrafficPatternLabel(config.trafficPattern) },
        { label: 'Live Load', value: formatRps(simulation?.loadRps ?? 0) },
      ];
    case NODE_KINDS.LOAD_BALANCER:
      return [
        { label: 'Algorithm', value: config.algorithm },
        { label: 'Targets', value: `${data.outgoingCount ?? 0}` },
      ];
    case NODE_KINDS.WEB_SERVER:
      return [
        { label: 'Latency', value: `${config.latencyMs} ms` },
        { label: 'Capacity', value: formatRps(config.capacityRps) },
        { label: 'Failure', value: `${config.failureRate}%` },
        { label: 'Live Load', value: formatRps(simulation?.loadRps ?? 0) },
      ];
    case NODE_KINDS.DATABASE:
      return [
        { label: 'Read', value: `${config.readLatencyMs} ms` },
        { label: 'Write', value: `${config.writeLatencyMs} ms` },
        { label: 'Conn', value: formatCompactNumber(config.connectionLimit) },
        { label: 'Live Load', value: formatRps(simulation?.loadRps ?? 0) },
      ];
    case NODE_KINDS.CACHE:
      return [
        { label: 'Latency', value: `${config.latencyMs} ms` },
        { label: 'Capacity', value: formatRps(config.capacityRps) },
        { label: 'Hit Rate', value: `${config.hitRate}%` },
        { label: 'Live Load', value: formatRps(simulation?.loadRps ?? 0) },
      ];
    default:
      return [];
  }
}

export default function ArchitectureNode({ data, selected }) {
  const registry = COMPONENT_REGISTRY[data.kind];
  const Icon = registry.icon;
  const simulation = data.simulation;
  const bottleneck = Boolean(simulation?.isBottleneck);
  const facts = getFacts(data, simulation);

  return (
    <div
      className={`relative w-[270px] rounded-[28px] border p-4 shadow-2xl shadow-black/20 transition ${
        bottleneck
          ? 'border-red-300/70 bg-red-500/10'
          : 'border-white/10 bg-slate-950/65'
      } ${selected ? 'ring-2 ring-cyan-300/60' : ''}`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-[28px] bg-gradient-to-r ${registry.accent}`}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border-2 !border-slate-950 !bg-cyan-200"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !border-2 !border-slate-950 !bg-amber-200"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${registry.accent} text-slate-950`}
          >
            <Icon size={20} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg text-white">{data.label}</div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
              {registry.label}
            </div>
          </div>
        </div>
        {bottleneck ? <Flame size={18} className="text-red-300" /> : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {fact.label}
            </div>
            <div className="mt-1 text-sm text-slate-100">{fact.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Success</div>
          <div className="mt-1 text-sm text-white">
            {formatPercent(simulation?.successProbability ?? 1)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Latency</div>
          <div className="mt-1 text-sm text-white">{formatCompactNumber(simulation?.latencyMs ?? 0)} ms</div>
        </div>
      </div>
    </div>
  );
}
