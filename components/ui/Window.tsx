import type { CSSProperties, PointerEventHandler, ReactNode } from "react";

const RESIZE_DIRECTIONS = ["n", "s", "w", "e", "nw", "ne", "sw", "se"] as const;

export type ResizeDirection = (typeof RESIZE_DIRECTIONS)[number];

interface PointerHandlers {
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
  onPointerCancel: PointerEventHandler<HTMLElement>;
}

interface WindowFrameProps {
  windowId: string;
  className: string;
  style: CSSProperties;
  onClose: () => void;
  onFocus: PointerEventHandler<HTMLElement>;
  drag: PointerHandlers;
  resize: PointerHandlers;
}

interface WindowProps extends WindowFrameProps {
  title: string;
  children: ReactNode;
}

export function Window({
  title,
  children,
  windowId,
  className,
  style,
  onClose,
  onFocus,
  drag,
  resize,
}: WindowProps) {
  const id = `window-${windowId}`;

  return (
    <section
      id={id}
      data-window-id={windowId}
      aria-labelledby={`${id}-title`}
      style={style}
      onPointerDown={onFocus}
      className={`os-window ${className}`}
    >
      <header className="os-window__titlebar os-titlebar" {...drag}>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          data-window-control
          className="os-window__control"
        >
          ×
        </button>
        <h2 id={`${id}-title`} className="os-window__title">
          {title}
        </h2>
        <span className="os-window__zoom" data-window-control aria-hidden="true" />
      </header>

      <div className="os-window__body">{children}</div>

      <div className="os-window__resize-layer" aria-hidden="true">
        {RESIZE_DIRECTIONS.map((direction) => (
          <span
            key={direction}
            data-resize-handle={direction}
            className={`os-window__handle os-window__handle--${direction}`}
            {...resize}
          />
        ))}
      </div>
    </section>
  );
}
