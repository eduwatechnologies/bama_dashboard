'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCategories, useDeleteWord, useWords } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ResourceTable, type Column } from '@/components/ResourceTable';
import { Pill } from '@/components/Pill';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ContentForm } from '@/components/ContentForm';
import { extractErrorMessage } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import type { ContentStatus, Word } from '@/lib/types';
import styles from './page.module.css';

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

export default function WordsPage() {
  const { admin } = useAuth();
  const canEdit = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN' || admin?.role === 'EDITOR';
  const canDelete = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<'' | ContentStatus>('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Word | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, isError, error, isFetching } = useWords({
    page,
    limit: pageSize,
    status: status || undefined,
    category: category || undefined,
  });
  const { data: categories = [] } = useCategories();

  const deleteWord = useDeleteWord();

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.items;
    return data.items.filter(
      (w) => w.english.toLowerCase().includes(q) || w.hausa.toLowerCase().includes(q),
    );
  }, [data, search]);

  const columns: Column<Word>[] = [
    {
      key: 'english',
      header: 'English',
      render: (row) => (
        <div>
          <div className={styles.cellPrimary}>{row.english}</div>
          <div className={styles.cellSecondary}>{row.description || '—'}</div>
        </div>
      ),
    },
    {
      key: 'hausa',
      header: 'Hausa',
      render: (row) => <span className={styles.cellPrimary}>{row.hausa}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => row.categoryId?.name ?? '—',
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
              title="Archive this word?"
              description={`“${row.english}” will be soft-deleted and removed from the next mobile sync.`}
              confirmLabel="Archive"
              destructive
              onConfirm={async () => {
                await deleteWord.mutateAsync(row._id);
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
          <h1>Words</h1>
          <p className={styles.subtitle}>
            Create, edit, and archive vocabulary. Publishing a word bumps the content version and ships it to mobile clients on their next sync.
          </p>
        </div>
      </header>

      {isError && (
        <div className={styles.errorBox}>
          Could not load words: {extractErrorMessage(error, 'unknown error')}
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
          filters={[
            {
              label: 'Status',
              value: status,
              onChange: (next) => {
                setStatus(next as '' | ContentStatus);
                setPage(1);
              },
              options: STATUS_FILTERS.map((opt) => ({ value: opt.value, label: opt.label })),
            },
            {
              label: 'Category',
              value: category,
              onChange: (next) => {
                setCategory(next);
                setPage(1);
              },
              options: [
                { value: '', label: 'All categories' },
                ...categories.map((item) => ({ value: item._id, label: item.name })),
              ],
            },
          ]}
          toolbarAction={
            canEdit && (
              <Button onClick={() => setCreating(true)}>New word</Button>
            )
          }
          empty="No words match these filters yet."
        />
      </Card>

      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit word' : 'Add a word'}
        description={
          editing
            ? 'Changes to status PUBLISHED bump the content version for mobile clients.'
            : 'Defaults to DRAFT — set status to PUBLISHED to ship it in the next sync.'
        }
        size="lg"
      >
        <ContentForm
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
