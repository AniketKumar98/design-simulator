import { ArrowRight, Copy, Flame, Trash2, X } from 'lucide-react';
import {
  COMPONENT_REGISTRY,
  getNodeCapacityUnit,
  isBufferingNodeKind,
  NODE_KINDS,
} from '../constants';
import {
  formatCompactNumber,
  formatPercent,
  formatRps,
  formatUtilization,
  formatValueWithUnit,
} from '../lib/format';

function formatNodeCapacity(node, capacity) {
  if (!Number.isFinite(capacity)) {
    return 'Unlimited';
  }

  return formatValueWithUnit(capacity, getNodeCapacityUnit(node.data.kind));
}

function getPressureCard(node, simulation) {
  if (isBufferingNodeKind(node.data.kind)) {
    return {
      label: 'Backlog',
      value: formatValueWithUnit(simulation?.backlogRps ?? 0, getNodeCapacityUnit(node.data.kind)),
    };
  }

  return {
    label: 'Dropped',
    value: formatRps(simulation?.rejectedRps ?? 0),
  };
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-1 font-display text-lg text-white">{value}</div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, tone = 'default' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
        tone === 'danger'
          ? 'border border-red-300/20 bg-red-400/10 text-red-100 hover:border-red-200/35 hover:bg-red-400/15'
          : 'border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:border-cyan-200/35 hover:bg-cyan-300/15'
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function NodeEditor({
  node,
  onDeleteSelection,
  onDuplicateNode,
  onFieldChange,
  onLabelChange,
}) {
  const registry = COMPONENT_REGISTRY[node.data.kind];
  const Icon = registry.icon;
  const simulation = node.data.simulation;
  const rejectedRps = simulation?.rejectedRps ?? 0;
  const pressureCard = getPressureCard(node, simulation);
  const backlogRps = simulation?.backlogRps ?? 0;
  const isBufferingNode = isBufferingNodeKind(node.data.kind);

  return (
    <>
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${registry.accent} text-slate-950`}>
          <Icon size={19} strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl text-white">{node.data.label}</h2>
            <span className="rounded-full border border-slate-700/80 bg-slate-950/50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
              {registry.shortLabel}
            </span>
            {simulation?.isBottleneck ? (
              <span className="flex items-center gap-1 rounded-full border border-red-300/20 bg-red-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-red-100">
                <Flame size={12} />
                Hot
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile label="Load" value={formatRps(simulation?.loadRps ?? 0)} />
        <StatTile label="Capacity" value={formatNodeCapacity(node, simulation?.capacity ?? Number.POSITIVE_INFINITY)} />
        <StatTile label="Utilization" value={formatUtilization(simulation?.loadRatio ?? 0)} />
        <StatTile label={pressureCard.label} value={pressureCard.value} />
      </div>

      {node.data.kind === NODE_KINDS.LOAD_BALANCER ? (
        <div className="mt-3">
          <StatTile label="Targets" value={`${node.data.outgoingCount ?? 0}`} />
        </div>
      ) : null}

      {simulation?.isBottleneck ? (
        <div className="mt-3 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100">
          {isBufferingNode
            ? 'Consumers are not draining this tier fast enough.'
            : 'This tier is receiving more traffic than it can safely process.'}
        </div>
      ) : null}

      {isBufferingNode && backlogRps > 0 ? (
        <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
          Backlog is growing by {formatValueWithUnit(backlogRps, getNodeCapacityUnit(node.data.kind))}.
        </div>
      ) : null}

      {!simulation?.isBottleneck && rejectedRps > 0 && !isBufferingNode ? (
        <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
          Success is currently {formatPercent(simulation?.successProbability ?? 1)}.
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton icon={Copy} label="Duplicate" onClick={onDuplicateNode} />
        <ActionButton icon={Trash2} label="Delete" onClick={onDeleteSelection} tone="danger" />
      </div>

      <label className="mt-4 block text-sm text-slate-300">
        <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Label</span>
        <input
          type="text"
          value={node.data.label}
          onChange={(event) => onLabelChange(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
        />
      </label>

      <div className="mt-4 space-y-3">
        {registry.fields.map((field) => (
          <label key={field.key} className="block text-sm text-slate-300">
            <span className="flex items-center justify-between gap-3">
              <span>{field.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                {field.unit ?? field.type}
              </span>
            </span>
            {field.type === 'select' ? (
              <select
                value={node.data.config[field.key]}
                onChange={(event) => onFieldChange(field.key, event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={node.data.config[field.key]}
                onChange={(event) => onFieldChange(field.key, event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
              />
            )}
          </label>
        ))}
      </div>
    </>
  );
}

function EdgeEditor({ edge, onDeleteSelection }) {
  const avgLatencyMs = edge.data?.avgLatencyMs ?? 0;
  const rps = edge.data?.rps ?? 0;
  const successRate = edge.data?.successRate ?? 1;

  return (
    <>
      <div className="rounded-2xl border border-slate-700/70 bg-slate-950/55 px-4 py-3">
        <div className="flex items-center gap-2 font-display text-lg text-white">
          <span>{edge.data?.sourceLabel ?? edge.source}</span>
          <ArrowRight size={16} className="text-cyan-200" />
          <span>{edge.data?.targetLabel ?? edge.target}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatTile label="Flow" value={formatRps(rps)} />
        <StatTile label="Success" value={formatPercent(successRate)} />
        <StatTile label="Latency" value={`${formatCompactNumber(avgLatencyMs)} ms`} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton icon={Trash2} label="Delete" onClick={onDeleteSelection} tone="danger" />
      </div>
    </>
  );
}

export default function PropertyInspector({
  edge,
  node,
  onClose,
  onDeleteSelection,
  onDuplicateNode,
  onFieldChange,
  onLabelChange,
}) {
  if (!node && !edge) {
    return null;
  }

  const registry = node ? COMPONENT_REGISTRY[node.data.kind] : null;

  return (
    <div className="pointer-events-auto absolute right-4 top-24 z-40 w-80">
      <section className="soft-scrollbar max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[28px] border border-slate-700/80 bg-slate-900/78 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-200/70">
              {node ? registry.label : 'Connection'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {node ? 'Node Properties' : 'Link Telemetry'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close inspector"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/60 text-slate-300 transition hover:border-slate-500/80 hover:bg-slate-900/80 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4">
          {node ? (
            <NodeEditor
              node={node}
              onDeleteSelection={onDeleteSelection}
              onDuplicateNode={onDuplicateNode}
              onFieldChange={onFieldChange}
              onLabelChange={onLabelChange}
            />
          ) : (
            <EdgeEditor edge={edge} onDeleteSelection={onDeleteSelection} />
          )}
        </div>
      </section>
    </div>
  );
}
