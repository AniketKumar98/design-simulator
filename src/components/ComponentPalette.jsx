import { ChevronDown, LayoutTemplate, Shapes } from 'lucide-react';
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
      className="group relative flex w-full items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/65 px-3 py-2.5 text-left text-white transition hover:-translate-y-0.5 hover:border-cyan-300/45 hover:bg-slate-900/90"
    >
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${registry.accent} opacity-15`} />
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-slate-900/75">
        <Icon size={17} strokeWidth={2.2} className="text-white" />
      </div>
      <div className="relative z-10 min-w-0">
        <div className="truncate text-sm font-semibold text-white">{registry.shortLabel}</div>
        <div className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          drag or click
        </div>
      </div>
    </button>
  );
}

export default function ComponentPalette({
  isOpen,
  onAddComponent,
  onLoadStarter,
  onOpenChange,
}) {
  const [isStarterMenuOpen, setIsStarterMenuOpen] = useState(false);

  function handleTogglePalette() {
    onOpenChange(!isOpen);

    if (isOpen) {
      setIsStarterMenuOpen(false);
    }
  }

  return (
    <div className="absolute left-4 top-24 z-40 w-56">
      <div className="pointer-events-auto flex w-52 flex-col gap-2">
        <button
          type="button"
          onClick={handleTogglePalette}
          className="flex items-center gap-3 rounded-[24px] border border-slate-700/80 bg-slate-900/82 px-3 py-3 text-left shadow-2xl shadow-black/35 backdrop-blur-xl transition hover:border-slate-500/80 hover:bg-slate-900/92"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-slate-950/70 text-cyan-100">
            <Shapes size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white">Components</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {isOpen ? 'hide rack' : 'open to drag or click'}
            </div>
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-300 transition ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          />
        </button>

        {!isOpen ? (
          <div className="rounded-[22px] border border-slate-700/70 bg-slate-900/68 px-3 py-3 text-xs leading-5 text-slate-300 shadow-xl shadow-black/25 backdrop-blur-xl">
            Open the component rack, then drag a service onto the canvas or click one to place it.
          </div>
        ) : null}
      </div>

      <div
        className={`pointer-events-auto mt-3 w-56 overflow-hidden rounded-[28px] border border-slate-700/80 bg-slate-900/78 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl transition-all duration-200 ${
          isOpen
            ? 'max-h-[calc(100vh-12rem)] translate-y-0 opacity-100'
            : 'pointer-events-none max-h-0 -translate-y-2 border-transparent p-0 opacity-0'
        }`}
      >
        <div className="mb-3 px-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-200/70">
            Component Rack
          </p>
          <p className="mt-1 text-xs text-slate-400">Drag onto the canvas or click to place.</p>
        </div>
        <div className="soft-scrollbar flex max-h-[calc(100vh-14rem)] flex-col gap-2 overflow-y-auto pr-1">
          {SIDEBAR_COMPONENTS.map((kind) => (
            <PaletteItem key={kind} kind={kind} onAddComponent={onAddComponent} />
          ))}
        </div>

        <div className="mt-3 border-t border-white/8 pt-3">
          <button
            type="button"
            title="Starter topologies"
            onClick={() => setIsStarterMenuOpen((current) => !current)}
            className="flex w-full items-center justify-between rounded-full border border-slate-700/80 bg-slate-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200 transition hover:border-slate-500/80 hover:bg-slate-900/90"
          >
            <span className="flex items-center gap-2">
              <LayoutTemplate size={14} />
              Presets
            </span>
            <ChevronDown
              size={14}
              className={`transition ${isStarterMenuOpen ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>

          {isStarterMenuOpen ? (
            <div className="mt-2 max-h-[32vh] overflow-y-auto rounded-[24px] border border-slate-700/80 bg-slate-900/70 p-2">
              <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Starter Topologies
              </p>
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
    </div>
  );
}
