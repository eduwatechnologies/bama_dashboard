import styles from './KpiGrid.module.css';

export type KpiTone = 'positive' | 'neutral' | 'warning' | 'critical';

export interface KpiItem {
  label: string;
  value: string;
  delta?: string;
  tone?: KpiTone;
}

export function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <div key={item.label} className={styles.card}>
          <span className={styles.label}>{item.label}</span>
          <span className={styles.value}>{item.value}</span>
          {item.delta && (
            <span className={`${styles.delta} ${styles[`tone_${item.tone ?? 'neutral'}`]}`}>
              {item.delta}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
