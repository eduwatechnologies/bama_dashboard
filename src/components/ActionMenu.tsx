'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import styles from './ActionMenu.module.css';

export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
  /** When true the menu is always visible instead of being collapsed behind the dots. */
  alwaysVisible?: boolean;
}

/**
 * Collapses a row's actions (Edit / Archive / …) behind a three-dot button.
 * Opens on click, closes on outside click, item select, or Escape.
 */
export function ActionMenu({ items, ariaLabel = 'Row actions', alwaysVisible = false }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div
      className={styles.wrap}
      ref={wrapRef}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
    >
      <Button
        type="button"
        size="sm"
        variant="secondary"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        leadingIcon={<span aria-hidden>•••</span>}
      >
        {alwaysVisible ? '' : ''}
      </Button>
      {open && (
        <div className={styles.menu} role="menu">
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className={`${styles.item} ${item.variant === 'destructive' ? styles.destructive : ''}`}
              disabled={item.disabled || item.loading}
              role="menuitem"
              onClick={() => {
                if (item.disabled || item.loading) return;
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon && <span className={styles.icon} aria-hidden>{item.icon}</span>}
              <span className={styles.label}>
                {item.loading ? 'Working…' : item.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}