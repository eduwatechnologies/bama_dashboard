'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useAds, useArchiveAd } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ResourceTable, type Column } from '@/components/ResourceTable';
import { Pill } from '@/components/Pill';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AdsForm } from '@/components/AdsForm';
import { extractErrorMessage } from '@/lib/api';
import { formatDate, formatRelative } from '@/lib/format';
import type { Ad, AdStatus, AdType } from '@/lib/types';
import styles from '../words/page.module.css';

const TYPE_FILTERS: { value: '' | AdType; label: string }[] = [
  { value: '', label: 'All providers' },
  { value: 'GOOGLE', label: 'Google Ads' },
  { value: 'PERSONAL', label: 'Personal ads' },
];

const STATUS_FILTERS: { value: '' | AdStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const STATUS_TONE: Record<AdStatus, 'positive' | 'neutral' | 'warning' | 'critical'> = {
  DRAFT: 'neutral',
  ACTIVE: 'positive',
  PAUSED: 'warning',
  ARCHIVED: 'critical',
};

function providerSummary(ad: Ad): string {
  if (ad.type === 'GOOGLE') {
    const testMode = ad.google?.testMode ? ' · test' : '';
    return `${ad.google?.format ?? 'Google'} · ${ad.google?.adUnitId ?? 'No ad unit'}${testMode}`;
  }
  return ad.personal?.title ?? 'Personal ad';
}

function scheduleSummary(ad: Ad): string {
  const start = ad.startsAt ? formatDate(ad.startsAt) : 'Anytime';
  const end = ad.endsAt ? formatDate(ad.endsAt) : 'No end date';
  return `${start} → ${end}`;
}

export default function AdsPage() {
  const { admin } = useAuth();
  const canWrite = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'' | AdType>('');
  const [status, setStatus] = useState<'' | AdStatus>('');
  const [editing, setEditing] = useState<Ad | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, isError, error, isFetching } = useAds({
    page,
    limit: pageSize,
    q: search.trim() || undefined,
    type: type || undefined,
    status: status || undefined,
  });
  const archiveAd = useArchiveAd();

  const columns: Column<Ad>[] = [
    {
      key: 'name',
      header: 'Ad',
      render: (row) => (
        <div>
          <div className={styles.cellPrimary}>{row.name}</div>
          <div className={styles.cellSecondary}>{providerSummary(row)}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Provider',
      render: (row) => <Pill tone={row.type === 'GOOGLE' ? 'info' : 'accent'}>{row.type === 'GOOGLE' ? 'Google' : 'Personal'}</Pill>,
      width: '120px',
    },
    {
      key: 'placement',
      header: 'Placement',
      render: (row) => <code style={{ fontSize: 12 }}>{row.placement}</code>,
      width: '150px',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Pill tone={STATUS_TONE[row.status]}>{row.status}</Pill>,
      width: '120px',
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (row) => <span className={styles.cellSecondary}>{scheduleSummary(row)}</span>,
      width: '230px',
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => <span className={styles.cellMuted}>{row.priority}</span>,
      width: '100px',
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (row) => <span className={styles.cellMuted}>{formatRelative(row.updatedAt)}</span>,
      width: '140px',
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className={styles.rowActions}>
          {canWrite && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
              Edit
            </Button>
          )}
          {canWrite && (
            <ConfirmDialog
              title="Archive this ad?"
              description={`“${row.name}” will stop serving and remain available in the archived filter.`}
              confirmLabel="Archive"
              destructive
              onConfirm={() => archiveAd.mutateAsync(row._id)}
              trigger={(open) => (
                <Button size="sm" variant="destructive" onClick={open}>
                  Archive
                </Button>
              )}
            />
          )}
        </div>
      ),
      width: '180px',
      sticky: true,
    },
  ];

  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>MONETIZATION</p>
          <h1>Ads</h1>
          <p className={styles.subtitle}>
            Configure Google and personal ads by placement. Active ads with a valid schedule are returned to mobile clients.
          </p>
        </div>
      </header>

      {isError && (
        <div className={styles.errorBox}>
          Could not load ads: {extractErrorMessage(error, 'unknown error')}
        </div>
      )}

      <Card>
        <ResourceTable
          rows={data?.items ?? []}
          columns={columns}
          getKey={(row) => row._id}
          loading={isLoading || isFetching}
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          onPageChange={setPage}
          search={{
            value: search,
            onChange: (next) => {
              setSearch(next);
              setPage(1);
            },
            placeholder: 'Search ads…',
          }}
          filters={[
            {
              label: 'Provider',
              value: type,
              onChange: (next) => {
                setType(next as '' | AdType);
                setPage(1);
              },
              options: TYPE_FILTERS.map((option) => ({ value: option.value, label: option.label })),
            },
            {
              label: 'Status',
              value: status,
              onChange: (next) => {
                setStatus(next as '' | AdStatus);
                setPage(1);
              },
              options: STATUS_FILTERS.map((option) => ({ value: option.value, label: option.label })),
            },
          ]}
          toolbarAction={
            canWrite && (
              <Button onClick={() => setCreating(true)}>New ad</Button>
            )
          }
          empty="No ads match these filters."
        />
      </Card>

      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit ad' : 'Add an ad'}
        description="Choose a provider, placement, and schedule. Draft ads stay out of the public feed."
        size="lg"
      >
        <AdsForm
          initial={editing ?? undefined}
          onDone={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </Modal>
    </>
  );
}
