import { ArrowRight, Copy, Trash2 } from 'lucide-react';
import { COMPONENT_REGISTRY, NODE_KINDS } from '../constants';

function formatCapacity(capacity) {
  return Number.isFinite(capacity) ? `${capacity} req/s` : 'Unlimited';
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

  return (
    <>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-white">{registry.label}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{registry.description}</p>
        </div>
        {simulation?.isBottleneck ? <span className="text-2xl">🔥</span> : null}
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
        <div className="rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
          <p className="text-sm text-slate-300">Current Load</p>
          <p className="mt-2 font-display text-3xl text-white">
            {Math.round(simulation?.loadRps ?? 0)} req/s
          </p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
          <p className="text-sm text-slate-300">Capacity</p>
          <p className="mt-2 font-display text-3xl text-white">
            {formatCapacity(simulation?.capacity ?? Number.POSITIVE_INFINITY)}
          </p>
        </div>
      </div>

      {node.data.kind === NODE_KINDS.LOAD_BALANCER ? (
        <div className="mt-3 rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
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
  const trafficIntensity = edge.data?.trafficIntensity ?? 0;
  const rps = edge.data?.rps ?? 0;

  return (
    <>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-white">Connection</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Inspect the selected path and remove it if you want to rewire the request flow.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
        <div className="flex items-center gap-2 font-display text-lg text-white">
          <span>{edge.data?.sourceLabel ?? edge.source}</span>
          <ArrowRight size={16} className="text-cyan-200" />
          <span>{edge.data?.targetLabel ?? edge.target}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-white/8 bg-white/5 px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Live Flow</div>
            <div className="mt-1 font-display text-2xl text-white">{Math.round(rps)} req/s</div>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/5 px-3 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Intensity</div>
            <div className="mt-1 font-display text-2xl text-white">
              {Math.round(trafficIntensity * 100)}%
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
  return (
    <section className="glass-panel panel-edge rounded-[28px] p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-cyan-200/70">
        Inspector
      </p>

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
        <>
          <h2 className="mt-2 font-display text-2xl text-white">Select a node or connection</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Click components to tune latency, capacity, and failure settings. Click connections to
            inspect or remove them.
          </p>
        </>
      )}

      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">
              On Board
            </p>
            <h3 className="mt-2 font-display text-xl text-white">Topology inventory</h3>
          </div>
          <div className="rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-300">
            {nodes.length} nodes / {edges.length} links
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {nodes.length > 0 ? (
            nodes.map((inventoryNode) => {
              const registry = COMPONENT_REGISTRY[inventoryNode.data.kind];

              return (
                <InventoryButton
                  key={inventoryNode.id}
                  active={selectedNodeId === inventoryNode.id}
                  title={inventoryNode.data.label}
                  description={registry.label}
                  meta={inventoryNode.data.simulation?.isBottleneck ? 'hot' : registry.shortLabel}
                  onClick={() => onSelectNode(inventoryNode.id)}
                />
              );
            })
          ) : (
            <div className="rounded-[18px] border border-white/10 bg-slate-950/35 px-3 py-3 text-sm text-slate-400">
              The board is empty. Use the quick-start templates or the Add buttons from the left
              panel.
            </div>
          )}
        </div>

        <div className="mt-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">
            Links
          </p>
          <div className="mt-3 space-y-2">
            {edges.length > 0 ? (
              edges.map((inventoryEdge) => (
                <InventoryButton
                  key={inventoryEdge.id}
                  active={selectedEdgeId === inventoryEdge.id}
                  title={`${inventoryEdge.data?.sourceLabel ?? inventoryEdge.source} -> ${inventoryEdge.data?.targetLabel ?? inventoryEdge.target}`}
                  description={`${Math.round(inventoryEdge.data?.rps ?? 0)} req/s live flow`}
                  meta={`${Math.round((inventoryEdge.data?.trafficIntensity ?? 0) * 100)}%`}
                  onClick={() => onSelectEdge(inventoryEdge.id)}
                />
              ))
            ) : (
              <div className="rounded-[18px] border border-white/10 bg-slate-950/35 px-3 py-3 text-sm text-slate-400">
                No links yet. Drag from a node’s right handle to another node’s left handle to
                connect them.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
