'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useActiveLanguages, useCategories, useDeleteWord, useWords } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ResourceTable, type Column } from '@/components/ResourceTable';
import { Pill } from '@/components/Pill';
import { AudioCell } from '@/components/AudioCell';
import { ActionMenu } from '@/components/ActionMenu';
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
  const { data: activeLanguages = [] } = useActiveLanguages();

  const deleteWord = useDeleteWord();

  const baseCode = activeLanguages.find((l) => l.code === 'en')?.code ?? activeLanguages[0]?.code ?? 'en';
  const otherLangs = activeLanguages.filter((l) => l.code !== baseCode);
  const languageNames = activeLanguages.reduce<Record<string, string>>((acc, l) => {
    acc[l.code] = l.name;
    return acc;
  }, {});

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.items;
    return data.items.filter((w) =>
      Object.values(w.translations ?? {}).some((text) => text.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const columns: Column<Word>[] = useMemo(() => {
    const cols: Column<Word>[] = [
      {
        key: 'translations',
        header: activeLanguages.find((l) => l.code === baseCode)?.name ?? 'English',
        render: (row) => (
          <div>
            <div className={styles.cellPrimary}>{row.translations?.[baseCode] ?? '—'}</div>
            <div className={styles.cellSecondary}>{row.description || '—'}</div>
          </div>
        ),
      },
    ];

    otherLangs.forEach((l) => {
      cols.push({
        key: `translation-${l.code}`,
        header: l.name,
        render: (row) => <span className={styles.cellPrimary}>{row.translations?.[l.code] ?? '—'}</span>,
      });
    });

    cols.push(
      {
        key: 'category',
        header: 'Category',
        render: (row) => row.categoryId?.name ?? '—',
      },
      {
        key: 'audio',
        header: 'Audio',
        render: (row) => {
          const audioEntries = Object.entries(row.audio ?? {})
            .map(([code, audio]: [string, any]) => {
              const url = typeof audio === 'string' ? audio : audio?.url ?? null;
              return { code, url };
            })
            .filter((e) => e.url);
          return (
            <AudioCell
              entries={audioEntries}
              label={row.translations?.[baseCode] ?? 'word'}
              languageNames={languageNames}
            />
          );
        },
        width: '160px',
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
          <ConfirmDialog
            title="Archive this word?"
            description={`“${row.translations?.[baseCode] ?? ''}” will be soft-deleted and removed from the next mobile sync.`}
            confirmLabel="Archive"
            destructive
            onConfirm={async () => {
              await deleteWord.mutateAsync(row._id);
            }}
            trigger={(open) => (
              <ActionMenu
                ariaLabel={`Actions for ${row.translations?.[baseCode] ?? 'word'}`}
                items={[
                  ...(canEdit
                    ? [{ label: 'Edit', onClick: () => setEditing(row) }]
                    : []),
                  ...(canDelete
                    ? [{ label: 'Archive', variant: 'destructive' as const, onClick: open }]
                    : []),
                ]}
              />
            )}
          />
        ),
        width: '60px',
        sticky: true,
      },
    );

    return cols;
  }, [activeLanguages, baseCode, otherLangs, canEdit, canDelete, deleteWord]);

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
          search={{ value: search, onChange: setSearch, placeholder: 'Search translations…' }}
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
