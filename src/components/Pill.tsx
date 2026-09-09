import styles from './Pill.module.css';

type Tone = 'positive' | 'neutral' | 'warning' | 'critical' | 'accent' | 'info';

const toneClass: Record<Tone, string> = {
  positive: styles.positive,
  neutral: styles.neutral,
  warning: styles.warning,
  critical: styles.critical,
  accent: styles.accent,
  info: styles.info,
};

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`${styles.pill} ${toneClass[tone]}`}>{children}</span>;
}
