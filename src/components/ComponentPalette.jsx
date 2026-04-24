import { Plus } from 'lucide-react';
import { COMPONENT_REGISTRY, SIDEBAR_COMPONENTS, STARTER_TOPOLOGIES } from '../constants';

export default function ComponentPalette({ onAddComponent, onLoadStarter }) {
  return (
    <section className="glass-panel panel-edge flex h-full flex-col rounded-[28px] p-5">
      <div className="mb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-cyan-200/70">
          Component Rack
        </p>
        <h2 className="mt-2 font-display text-2xl text-white">
          Add or drag nodes into the topology
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Click `Add` for quick placement, or drag cards onto the canvas when you want precise
          positioning.
        </p>
      </div>

      <div className="soft-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
        {SIDEBAR_COMPONENTS.map((kind) => {
          const registry = COMPONENT_REGISTRY[kind];
          const Icon = registry.icon;

          return (
            <div
              key={kind}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('application/architectsim-node', kind);
                event.dataTransfer.effectAllowed = 'move';
              }}
              className="group relative w-full overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/35 p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-slate-900/55"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${registry.accent} opacity-75`}
              />
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${registry.accent} text-slate-950 shadow-lg shadow-black/20`}
                >
                  <Icon size={20} strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-base text-white">{registry.shortLabel}</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
                        Drag
                      </span>
                      <button
                        type="button"
                        onClick={() => onAddComponent(kind)}
                        className="flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-200/35 hover:bg-cyan-300/15"
                      >
                        <Plus size={12} />
                        Add
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-300">{registry.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-200/70">
          Quick Start
        </p>
        <div className="mt-3 space-y-2">
          {STARTER_TOPOLOGIES.map((topology) => (
            <button
              key={topology.id}
              type="button"
              onClick={() => onLoadStarter(topology.id)}
              className="w-full rounded-[18px] border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:border-white/20 hover:bg-white/10"
            >
              <div className="font-display text-sm text-white">{topology.label}</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">{topology.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-slate-950/35 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-amber-200/70">
          Connect Nodes
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Drag from the amber dot on a component’s right side to the cyan dot on the left side of
          another component, just like drawing a flow in diagramming tools.
        </p>
      </div>
    </section>
  );
}
