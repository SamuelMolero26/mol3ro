import type { ReactNode } from "react";

interface AquaProps {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  /* An href renders an anchor; otherwise it is a button. */
  href?: string;
  /* Only meaningful alongside href. */
  target?: string;
  rel?: string;
  onClick?: () => void;
}

export function AquaButton({ children, className, fullWidth, href, target, rel, onClick }: AquaProps) {
  const props = {
    className: ["aqua-button", fullWidth ? "aqua-button--block" : "", className ?? ""]
      .filter(Boolean)
      .join(" "),
    children: (
      <>
        <span className="aqua-button__gloss" aria-hidden="true" />
        <span className="aqua-button__label">{children}</span>
      </>
    ),
  };

  return href ? (
    <a href={href} target={target} rel={rel} {...props} />
  ) : (
    <button type="button" onClick={onClick} {...props} />
  );
}
