import { useState } from 'react';
import { COMPONENT_REGISTRY, SIDEBAR_COMPONENTS, STARTER_TOPOLOGIES } from '../constants';

function PaletteItem({ kind, onAddComponent }) {
  const registry = COMPONENT_REGISTRY[kind];
  const Icon = registry.icon;

  return (
    <button
      type="button"
      draggable
      title={`${registry.label} - click or drag`}
      onClick={() => onAddComponent(kind)}
      onDragStart={(event) => {
        event.dataTransfer.setData('application/architectsim-node', kind);
        event.dataTransfer.effectAllowed = 'move';
      }}
      className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-950/65 text-white transition hover:-translate-y-0.5 hover:border-cyan-300/45 hover:bg-slate-900/90"
    >
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${registry.accent} opacity-15`} />
      <Icon size={18} strokeWidth={2.2} className="relative z-10 text-white" />
      <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-full border border-slate-700/80 bg-slate-950/92 px-3 py-1.5 text-xs font-medium text-slate-100 opacity-0 shadow-xl shadow-black/30 backdrop-blur-md transition group-hover:opacity-100">
        {registry.shortLabel}
      </span>
    </button>
  );
}

export default function ComponentPalette({ onAddComponent, onLoadStarter }) {
  const [isStarterMenuOpen, setIsStarterMenuOpen] = useState(false);

  return (
    <div className="absolute left-4 top-24 z-40 flex max-h-[calc(100vh-8rem)] flex-col gap-3">
      <div className="pointer-events-auto rounded-[28px] border border-slate-700/80 bg-slate-900/78 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <div className="soft-scrollbar flex max-h-[calc(100vh-12rem)] flex-col gap-2 overflow-y-auto pr-1">
          {SIDEBAR_COMPONENTS.map((kind) => (
            <PaletteItem key={kind} kind={kind} onAddComponent={onAddComponent} />
          ))}
        </div>
      </div>

      <div className="pointer-events-auto relative">
        <button
          type="button"
          title="Starter topologies"
          onClick={() => setIsStarterMenuOpen((current) => !current)}
          className="rounded-full border border-slate-700/80 bg-slate-900/78 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200 shadow-xl shadow-black/30 backdrop-blur-xl transition hover:border-slate-500/80 hover:bg-slate-900/90"
        >
          Presets
        </button>

        {isStarterMenuOpen ? (
          <div className="absolute left-full top-0 ml-3 w-56 rounded-[24px] border border-slate-700/80 bg-slate-900/88 p-2 shadow-2xl shadow-black/35 backdrop-blur-xl">
            {STARTER_TOPOLOGIES.map((topology) => (
              <button
                key={topology.id}
                type="button"
                onClick={() => {
                  onLoadStarter(topology.id);
                  setIsStarterMenuOpen(false);
                }}
                className="w-full rounded-2xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/8"
              >
                {topology.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
