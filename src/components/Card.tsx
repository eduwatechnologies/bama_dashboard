import type { CSSProperties, ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function Card({ title, description, action, children, style, className }: CardProps) {
  return (
    <section className={`${styles.card} ${className ?? ''}`} style={style}>
      {(title || action) && (
        <header className={styles.header}>
          <div>
            {title && <h2 className={styles.title}>{title}</h2>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </header>
      )}
      <div className={styles.body}>{children}</div>
    </section>
  );
}
