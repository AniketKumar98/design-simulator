import { ArrowRight, Copy, Flame, Trash2 } from 'lucide-react';
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
import CollapsibleSection from './CollapsibleSection';

function formatNodeCapacity(node, capacity) {
  if (!Number.isFinite(capacity)) {
    return 'Unlimited';
  }

  return formatValueWithUnit(capacity, getNodeCapacityUnit(node.data.kind));
}

function getPressureCard(node, simulation) {
  if (isBufferingNodeKind(node.data.kind)) {
    return {
      label: 'Backlog Growth',
      value: formatValueWithUnit(simulation?.backlogRps ?? 0, getNodeCapacityUnit(node.data.kind)),
    };
  }

  return {
    label: 'Dropped Traffic',
    value: formatRps(simulation?.rejectedRps ?? 0),
  };
}

function InventoryButton({
  active,
  description,
  meta,
  onClick,
  title,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[18px] border px-3 py-3 text-left transition ${
        active
          ? 'border-cyan-300/40 bg-cyan-300/10'
          : 'border-white/10 bg-slate-950/35 hover:border-white/20 hover:bg-slate-900/55'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-sm text-white">{title}</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">{description}</div>
        </div>
        {meta ? (
          <div className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
            {meta}
          </div>
        ) : null}
      </div>
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
  const simulation = node.data.simulation;
  const rejectedRps = simulation?.rejectedRps ?? 0;
  const pressureCard = getPressureCard(node, simulation);
  const backlogRps = simulation?.backlogRps ?? 0;
  const isBufferingNode = isBufferingNodeKind(node.data.kind);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-white">{registry.label}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{registry.description}</p>
        </div>
        {simulation?.isBottleneck ? (
          <div className="flex items-center gap-2 rounded-full border border-red-300/20 bg-red-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-100">
            <Flame size={14} />
            Hot
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onDuplicateNode}
          className="flex items-center justify-center gap-2 rounded-[18px] border border-cyan-300/20 bg-cyan-300/10 px-3 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/35 hover:bg-cyan-300/15"
        >
          <Copy size={16} />
          Duplicate Node
        </button>
        <button
          type="button"
          onClick={onDeleteSelection}
          className="flex items-center justify-center gap-2 rounded-[18px] border border-red-300/20 bg-red-400/10 px-3 py-3 text-sm font-semibold text-red-100 transition hover:border-red-200/35 hover:bg-red-400/15"
        >
          <Trash2 size={16} />
          Delete Node
        </button>
      </div>

      <label className="mt-5 block text-sm text-slate-300">
        Label
        <input
          type="text"
          value={node.data.label}
          onChange={(event) => onLabelChange(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
        />
      </label>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-slate-300">Current Load</p>
          <p className="mt-2 font-display text-3xl text-white">{formatRps(simulation?.loadRps ?? 0)}</p>
        </div>
        <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-slate-300">Capacity Ceiling</p>
          <p className="mt-2 font-display text-3xl text-white">
            {formatNodeCapacity(node, simulation?.capacity ?? Number.POSITIVE_INFINITY)}
          </p>
        </div>
        <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-slate-300">Utilization</p>
          <p className="mt-2 font-display text-3xl text-white">
            {formatUtilization(simulation?.loadRatio ?? 0)}
          </p>
        </div>
        <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-slate-300">{pressureCard.label}</p>
          <p className="mt-2 font-display text-3xl text-white">{pressureCard.value}</p>
        </div>
      </div>

      {simulation?.isBottleneck ? (
        <div className="mt-3 rounded-[18px] border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100">
          {isBufferingNode
            ? 'This node is ingesting more work than consumers can drain. Add throughput, add more consumers, or reduce the upstream publish rate.'
            : 'This node is receiving more traffic than it can safely process. Add capacity, scale the tier out, or reduce the upstream request load.'}
        </div>
      ) : null}

      {isBufferingNode && backlogRps > 0 ? (
        <div className="mt-3 rounded-[18px] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
          Incoming publish volume exceeds the configured throughput by{' '}
          {formatValueWithUnit(backlogRps, getNodeCapacityUnit(node.data.kind))}. This represents
          backlog growth in the current simulation window.
        </div>
      ) : null}

      {!simulation?.isBottleneck && rejectedRps > 0 && !isBufferingNode ? (
        <div className="mt-3 rounded-[18px] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
          This node is still dropping {formatRps(rejectedRps)} because its estimated success rate is{' '}
          {formatPercent(simulation?.successProbability ?? 1)}.
        </div>
      ) : null}

      {node.data.kind === NODE_KINDS.LOAD_BALANCER ? (
        <div className="mt-3 rounded-[18px] border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-slate-300">Connected Targets</p>
          <p className="mt-2 font-display text-3xl text-white">{node.data.outgoingCount ?? 0}</p>
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {registry.fields.map((field) => (
          <label key={field.key} className="block text-sm text-slate-300">
            <span className="flex items-center justify-between gap-3">
              <span>{field.label}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                {field.unit ?? field.type}
              </span>
            </span>
            {field.type === 'select' ? (
              <select
                value={node.data.config[field.key]}
                onChange={(event) => onFieldChange(field.key, event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
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
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
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
      <div>
        <h2 className="font-display text-2xl text-white">Connection</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Inspect the selected path and remove it if you want to rewire the request or event flow.
        </p>
      </div>

      <div className="mt-5 rounded-[18px] border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 font-display text-lg text-white">
          <span>{edge.data?.sourceLabel ?? edge.source}</span>
          <ArrowRight size={16} className="text-cyan-200" />
          <span>{edge.data?.targetLabel ?? edge.target}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] border border-white/8 bg-slate-950/35 px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Live Flow</div>
            <div className="mt-1 font-display text-2xl text-white">{formatRps(rps)}</div>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-slate-950/35 px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Success</div>
            <div className="mt-1 font-display text-2xl text-white">{formatPercent(successRate)}</div>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-slate-950/35 px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Avg Latency</div>
            <div className="mt-1 font-display text-2xl text-white">
              {formatCompactNumber(avgLatencyMs)} ms
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onDeleteSelection}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[18px] border border-red-300/20 bg-red-400/10 px-3 py-3 text-sm font-semibold text-red-100 transition hover:border-red-200/35 hover:bg-red-400/15"
      >
        <Trash2 size={16} />
        Delete Connection
      </button>
    </>
  );
}

export default function PropertyInspector({
  edge,
  edges,
  node,
  nodes,
  onDeleteSelection,
  onDuplicateNode,
  onFieldChange,
  onLabelChange,
  onSelectEdge,
  onSelectNode,
  selectedEdgeId,
  selectedNodeId,
}) {
  const activeMeta = node
    ? COMPONENT_REGISTRY[node.data.kind].shortLabel
    : edge
      ? 'link'
      : 'nothing selected';

  return (
    <section className="glass-panel panel-edge rounded-[28px] p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-cyan-200/70">
        Inspector
      </p>

      <div className="mt-5 space-y-4">
        <CollapsibleSection
          title="Selection Details"
          subtitle="Edit the currently selected node or connection."
          meta={activeMeta}
        >
          {node ? (
            <NodeEditor
              node={node}
              onDeleteSelection={onDeleteSelection}
              onDuplicateNode={onDuplicateNode}
              onFieldChange={onFieldChange}
              onLabelChange={onLabelChange}
            />
          ) : edge ? (
            <EdgeEditor edge={edge} onDeleteSelection={onDeleteSelection} />
          ) : (
            <div>
              <h2 className="font-display text-2xl text-white">Select a node or connection</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Click components to tune latency, throughput, capacity, retention, and failure
                settings. Click links to inspect or remove them.
              </p>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Nodes on Board"
          subtitle="Jump to any component without hunting across the canvas."
          meta={`${nodes.length} nodes`}
          defaultOpen={false}
        >
          <div className="space-y-2">
            {nodes.length > 0 ? (
              nodes.map((inventoryNode) => {
                const registry = COMPONENT_REGISTRY[inventoryNode.data.kind];

                return (
                  <InventoryButton
                    key={inventoryNode.id}
                    active={selectedNodeId === inventoryNode.id}
                    title={inventoryNode.data.label}
                    description={registry.label}
                    meta={inventoryNode.data.simulation?.isBottleneck ? 'overloaded' : registry.shortLabel}
                    onClick={() => onSelectNode(inventoryNode.id)}
                  />
                );
              })
            ) : (
              <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-400">
                The board is empty. Use the quick-start templates or the Add buttons from the left
                panel.
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Links"
          subtitle="Inspect or jump to the currently wired request and event paths."
          meta={`${edges.length} links`}
          defaultOpen={false}
        >
          <div className="space-y-2">
            {edges.length > 0 ? (
              edges.map((inventoryEdge) => (
                <InventoryButton
                  key={inventoryEdge.id}
                  active={selectedEdgeId === inventoryEdge.id}
                  title={`${inventoryEdge.data?.sourceLabel ?? inventoryEdge.source} -> ${inventoryEdge.data?.targetLabel ?? inventoryEdge.target}`}
                  description={`${formatRps(inventoryEdge.data?.rps ?? 0)} live flow | ${formatCompactNumber(inventoryEdge.data?.avgLatencyMs ?? 0)} ms avg latency`}
                  meta={formatPercent(inventoryEdge.data?.successRate ?? 1)}
                  onClick={() => onSelectEdge(inventoryEdge.id)}
                />
              ))
            ) : (
              <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-400">
                No links yet. Drag from a node&apos;s right handle to another node&apos;s left handle to
                connect them.
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </section>
  );
}
