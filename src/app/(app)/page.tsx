'use client';

import Link from 'next/link';
import { useDashboard, useContributions } from '@/lib/hooks';
import { KpiGrid } from '@/components/KpiGrid';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { formatRelative } from '@/lib/format';
import { extractErrorMessage } from '@/lib/api';
import styles from './page.module.css';

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboard();
  const { data: pending } = useContributions({ status: 'PENDING', limit: 1 });

  const summary = data;

  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>OVERVIEW</p>
          <h1>Welcome back{summary ? '' : ' to Bama'}</h1>
          <p className={styles.subtitle}>
            Live counts of published content, pending reviews, and active installations.
          </p>
        </div>
        <div className={styles.headerActions}>
          {summary && (
            <span className={styles.dateTag}>Content version · v{summary.contentVersion}</span>
          )}
        </div>
      </header>

      {isError && (
        <div className={styles.errorBox}>
          Could not load the dashboard: {extractErrorMessage(error, 'unknown error')}
        </div>
      )}

      <KpiGrid
        items={[
          {
            label: 'Total words',
            value: isLoading ? '—' : String(summary?.totalWords ?? 0),
            delta: summary ? `${summary.totalPhrases} phrases` : '—',
            tone: 'positive',
          },
          {
            label: 'Categories',
            value: isLoading ? '—' : String(summary?.totalCategories ?? 0),
            delta: 'Active taxonomy',
            tone: 'neutral',
          },
          {
            label: 'Pending reviews',
            value: pending ? String(pending.total) : '—',
            delta: 'From the community',
            tone: pending && pending.total > 0 ? 'warning' : 'neutral',
          },
          {
            label: 'Installations',
            value: isLoading ? '—' : String(summary?.totalInstallations ?? 0),
            delta: 'All platforms',
            tone: 'positive',
          },
        ]}
      />

      <div className={styles.split}>
        <Card title="Quick actions" description="The places you'll spend most of your time.">
          <div className={styles.quickGrid}>
            <Link href="/words" className={styles.quickLink}>
              <strong>Manage words</strong>
              <span>Create, edit, archive vocabulary.</span>
            </Link>
            <Link href="/phrases" className={styles.quickLink}>
              <strong>Manage phrases</strong>
              <span>Curate the daily phrasebook.</span>
            </Link>
            <Link href="/contributions" className={styles.quickLink}>
              <strong>Review queue</strong>
              <span>{pending ? `${pending.total} pending` : 'Pending submissions'}</span>
            </Link>
            <Link href="/installations" className={styles.quickLink}>
              <strong>Installations</strong>
              <span>Active devices and sync versions.</span>
            </Link>
          </div>
        </Card>

        <Card
          title="Latest activity"
          description="Pulled from the dashboard and contributions endpoints."
          action={
            <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          }
        >
          <ul className={styles.activity}>
            <li>
              <span>Last sync</span>
              <strong>{formatRelative(summary ? new Date().toISOString() : null)}</strong>
            </li>
            <li>
              <span>Content version</span>
              <strong>v{summary?.contentVersion ?? '—'}</strong>
            </li>
            <li>
              <span>Pending contributions</span>
              <strong>{pending?.total ?? '—'}</strong>
            </li>
            <li>
              <span>Total categories</span>
              <strong>{summary?.totalCategories ?? '—'}</strong>
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
