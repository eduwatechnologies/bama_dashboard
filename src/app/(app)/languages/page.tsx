'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLanguages } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ResourceTable, type Column } from '@/components/ResourceTable';
import { Pill } from '@/components/Pill';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LanguageForm } from '@/components/LanguageForm';
import { extractErrorMessage } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import type { Language } from '@/lib/types';
import styles from '../words/page.module.css';
import { useDeleteLanguage } from '@/lib/hooks';

const STATUS_TONE = {
  true: 'positive',
  false: 'neutral',
} as const;

export default function LanguagesPage() {
  const { admin } = useAuth();
  const canWrite = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Language | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: items = [], isLoading, isError, error, isFetching } = useLanguages();
  const deleteLanguage = useDeleteLanguage();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [items, search]);

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const columns: Column<Language>[] = [
    {
      key: 'name',
      header: 'Language',
      render: (row) => (
        <div>
          <div className={styles.cellPrimary}>
            {row.flag ? `${row.flag} ` : ''}
            {row.name}
          </div>
          <div className={styles.cellSecondary}>{row.nativeName}</div>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      render: (row) => <code style={{ fontSize: 12 }}>{row.code}</code>,
    },
    {
      key: 'direction',
      header: 'Direction',
      render: (row) => (row.isRTL ? 'RTL' : 'LTR'),
      width: '120px',
    },
    {
      key: 'order',
      header: 'Order',
      render: (row) => String(row.order ?? 0),
      width: '100px',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Pill tone={STATUS_TONE[String(row.isActive) as keyof typeof STATUS_TONE] ?? 'neutral'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Pill>
      ),
      width: '120px',
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (row) => (
        <span className={styles.cellMuted}>
          {row.updatedAt ? formatRelative(row.updatedAt) : '—'}
        </span>
      ),
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
          {canWrite && row.code !== 'en' && (
            <ConfirmDialog
              title="Delete this language?"
              description={`“${row.name}” will be removed. Content translations for this code will remain in the database but will no longer be selectable.`}
              confirmLabel="Delete"
              destructive
              onConfirm={async () => {
                await deleteLanguage.mutateAsync(row.code);
              }}
              trigger={(open) => (
                <Button size="sm" variant="destructive" onClick={open}>
                  Delete
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
          <p className={styles.eyebrow}>CONFIGURATION</p>
          <h1>Languages</h1>
          <p className={styles.subtitle}>
            Manage available languages. English (<code>en</code>) is the base language and cannot be
            deleted. Adding a language makes it available across the app and content forms.
          </p>
        </div>
      </header>

      {isError && (
        <div className={styles.errorBox}>
          Could not load languages: {extractErrorMessage(error, 'unknown error')}
        </div>
      )}

      <Card>
        <ResourceTable
          rows={pageItems}
          columns={columns}
          getKey={(r) => r._id ?? r.code}
          loading={isLoading || isFetching}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          search={{ value: search, onChange: (next) => { setSearch(next); setPage(1); } }}
          toolbarAction={
            canWrite && (
              <Button onClick={() => setCreating(true)}>Add language</Button>
            )
          }
          empty="No languages match your search."
        />
      </Card>

      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit language' : 'Add a language'}
        description="Active languages appear in the mobile app and content forms. Use the ISO 639-1 code."
        size="md"
      >
        <LanguageForm
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
