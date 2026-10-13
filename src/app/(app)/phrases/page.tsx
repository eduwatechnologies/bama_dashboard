'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useActiveLanguages, useCategories, useDeletePhrase, usePhrases } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ResourceTable, type Column } from '@/components/ResourceTable';
import { Pill } from '@/components/Pill';
import { AudioCell } from '@/components/AudioCell';
import { ActionMenu } from '@/components/ActionMenu';
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
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Phrase | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, isError, error, isFetching } = usePhrases({
    page,
    limit: pageSize,
    status: status || undefined,
    category: category || undefined,
  });
  const { data: categories = [] } = useCategories();
  const { data: activeLanguages = [] } = useActiveLanguages();

  const deletePhrase = useDeletePhrase();

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
    return data.items.filter((p) =>
      Object.values(p.translations ?? {}).some((text) => text.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const columns: Column<Phrase>[] = useMemo(() => {
    const cols: Column<Phrase>[] = [
      {
        key: 'translations',
        header: activeLanguages.find((l) => l.code === baseCode)?.name ?? 'English',
        render: (row) => <div className={styles.cellPrimary}>{row.translations?.[baseCode] ?? '—'}</div>,
      },
    ];

    otherLangs.forEach((l) => {
      cols.push({
        key: `translation-${l.code}`,
        header: l.name,
        render: (row) => <div className={styles.cellPrimary}>{row.translations?.[l.code] ?? '—'}</div>,
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
              label={row.translations?.[baseCode] ?? 'phrase'}
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
            title="Archive this phrase?"
            description={`“${row.translations?.[baseCode] ?? ''}” will be soft-deleted and removed from the next mobile sync.`}
            confirmLabel="Archive"
            destructive
            onConfirm={async () => {
              await deletePhrase.mutateAsync(row._id);
            }}
            trigger={(open) => (
              <ActionMenu
                ariaLabel={`Actions for ${row.translations?.[baseCode] ?? 'phrase'}`}
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
  }, [activeLanguages, baseCode, otherLangs, canEdit, canDelete, deletePhrase]);

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
