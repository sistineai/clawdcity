// A modal sheet: labelled, focus moves in on open and back out on close, Escape closes.
import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({
  labelId,
  onClose,
  children,
  className = '',
  tone = 'gold',
}: {
  labelId: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  tone?: 'gold' | 'flare' | 'spruce';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );
    (first ?? el)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={ref}
        className={`sheet tone-${tone} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
