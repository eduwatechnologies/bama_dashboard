'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useDeletePhrase, usePhrases } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ResourceTable, type Column } from '@/components/ResourceTable';
import { Pill } from '@/components/Pill';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PhraseForm } from '@/components/PhraseForm';
import { extractErrorMessage } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import type { ContentStatus, Phrase } from '@/lib/types';
import styles from '../words/page.module.css';

const STATUS_FILTERS: { value: '' | ContentStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const STATUS_TONE: Record<ContentStatus, 'positive' | 'neutral' | 'warning'> = {
  PUBLISHED: 'positive',
  DRAFT: 'warning',
  ARCHIVED: 'neutral',
};

export default function PhrasesPage() {
  const { admin } = useAuth();
  const canEdit = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN' || admin?.role === 'EDITOR';
  const canDelete = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<'' | ContentStatus>('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Phrase | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, isError, error, isFetching } = usePhrases({
    page,
    limit: pageSize,
    status: status || undefined,
  });

  const deletePhrase = useDeletePhrase();

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.items;
    return data.items.filter(
      (p) => p.english.toLowerCase().includes(q) || p.hausa.toLowerCase().includes(q),
    );
  }, [data, search]);

  const columns: Column<Phrase>[] = [
    {
      key: 'english',
      header: 'English',
      render: (row) => <div className={styles.cellPrimary}>{row.english}</div>,
    },
    {
      key: 'hausa',
      header: 'Hausa',
      render: (row) => <div className={styles.cellPrimary}>{row.hausa}</div>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => row.categoryId?.name ?? '—',
    },
    
    {
      key: 'audio',
      header: 'Audio',
      render: (row) => (row.audio?.url ? <Pill tone="accent">Linked</Pill> : <Pill tone="neutral">None</Pill>),
      width: '120px',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Pill tone={STATUS_TONE[row.status]}>{row.status}</Pill>,
      width: '130px',
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
          {canEdit && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <ConfirmDialog
              title="Archive this phrase?"
              description={`“${row.english}” will be soft-deleted and removed from the next mobile sync.`}
              confirmLabel="Archive"
              destructive
              onConfirm={async () => {
                await deletePhrase.mutateAsync(row._id);
              }}
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
          <p className={styles.eyebrow}>CONTENT</p>
          <h1>Phrases</h1>
          <p className={styles.subtitle}>
            Curate the everyday phrasebook. Publish a phrase to push it to the next content sync.
          </p>
        </div>
      </header>

      {isError && (
        <div className={styles.errorBox}>
          Could not load phrases: {extractErrorMessage(error, 'unknown error')}
        </div>
      )}

      <Card>
        <ResourceTable
          rows={rows}
          columns={columns}
          getKey={(r) => r._id}
          loading={isLoading || isFetching}
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          onPageChange={setPage}
          search={{ value: search, onChange: setSearch, placeholder: 'Search English or Hausa…' }}
          filter={{
            label: 'Status',
            value: status,
            onChange: (next) => {
              setStatus(next as '' | ContentStatus);
              setPage(1);
            },
            options: STATUS_FILTERS.map((opt) => ({ value: opt.value, label: opt.label })),
          }}
          toolbarAction={
            canEdit && (
              <Button onClick={() => setCreating(true)}>New phrase</Button>
            )
          }
          empty="No phrases match these filters yet."
        />
      </Card>

      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit phrase' : 'Add a phrase'}
        description={
          editing
            ? 'Changes to status PUBLISHED bump the content version for mobile clients.'
            : 'Defaults to DRAFT — set status to PUBLISHED to ship it in the next sync.'
        }
        size="md"
      >
        <PhraseForm
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
