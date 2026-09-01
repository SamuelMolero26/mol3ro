import type { ReactNode } from "react";

interface DockIconProps {
  label: string;
  active: boolean;
  controls: string;
  onClick: () => void;
  children: ReactNode;
}

export function DockIcon({ label, active, controls, onClick, children }: DockIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-controls={controls}
      aria-pressed={active}
      aria-label={active ? `Close ${label} window` : `Open ${label} window`}
      className="dock-icon"
    >
      <span className="dock-icon__tile" aria-hidden="true">
        <span className="dock-icon__glyph">{children}</span>
      </span>
      <span className="dock-icon__label">{label}</span>
    </button>
  );
}
