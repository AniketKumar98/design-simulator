import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function CollapsibleSection({
  bodyClassName = '',
  children,
  className = '',
  defaultOpen = true,
  meta,
  subtitle,
  title,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className={`rounded-[22px] border border-white/10 bg-slate-950/35 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-white">{title}</span>
            {meta ? (
              <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
                {meta}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        <ChevronDown
          size={18}
          className={`mt-1 shrink-0 text-slate-300 transition ${isOpen ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>

      {isOpen ? <div className={`px-4 pb-4 ${bodyClassName}`}>{children}</div> : null}
    </section>
  );
}
