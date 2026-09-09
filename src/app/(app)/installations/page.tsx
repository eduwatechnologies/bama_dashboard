'use client';

import { useState } from 'react';
import { useInstallations } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { ResourceTable, type Column } from '@/components/ResourceTable';
import { Pill } from '@/components/Pill';
import { extractErrorMessage } from '@/lib/api';
import { formatDate, formatRelative } from '@/lib/format';
import type { Installation } from '@/lib/types';
import styles from '../words/page.module.css';

export default function InstallationsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const { data, isLoading, isError, error, isFetching } = useInstallations({ page, limit: pageSize });

  const columns: Column<Installation>[] = [
    {
      key: 'installation',
      header: 'Installation',
      render: (row) => (
        <div>
          <div className={styles.cellPrimary}>{row.installationId}</div>
          <div className={styles.cellSecondary}>
            First seen {formatDate(row.firstSeenAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'app',
      header: 'App',
      render: (row) => (
        <div>
          <div className={styles.cellPrimary}>v{row.appVersion}</div>
          <div className={styles.cellSecondary}>
            {row.platform} · {row.deviceLanguage ?? 'unknown locale'}
          </div>
        </div>
      ),
      width: '200px',
    },
    {
      key: 'content',
      header: 'Content',
      render: (row) => <Pill tone="info">v{row.contentVersion}</Pill>,
      width: '120px',
    },
    {
      key: 'lastSeen',
      header: 'Last seen',
      render: (row) => (
        <div>
          <div className={styles.cellMuted}>{formatRelative(row.lastSeenAt)}</div>
          <div className={styles.cellSecondary}>Synced {formatRelative(row.lastSyncAt)}</div>
        </div>
      ),
      width: '200px',
    },
  ];

  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>TELEMETRY</p>
          <h1>Installations</h1>
          <p className={styles.subtitle}>
            Anonymous device telemetry. Use this to track app version adoption and content version uptake.
          </p>
        </div>
      </header>

      {isError && (
        <div className={styles.errorBox}>
          Could not load installations: {extractErrorMessage(error, 'unknown error')}
        </div>
      )}

      <Card>
        <ResourceTable
          rows={data?.items ?? []}
          columns={columns}
          getKey={(r) => r._id}
          loading={isLoading || isFetching}
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          onPageChange={setPage}
          empty="No installations recorded yet."
        />
      </Card>
    </>
  );
}
