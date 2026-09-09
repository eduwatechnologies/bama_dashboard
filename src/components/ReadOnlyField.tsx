'use client';

import type { ReactNode } from 'react';
import styles from './ReadOnlyField.module.css';

export function ReadOnlyField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{children || '—'}</span>
    </div>
  );
}
