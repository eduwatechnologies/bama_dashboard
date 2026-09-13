'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCategories } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ResourceTable, type Column } from '@/components/ResourceTable';
import { Pill } from '@/components/Pill';
import { CategoryForm } from '@/components/CategoryForm';
import { extractErrorMessage } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import type { Category } from '@/lib/types';
import styles from '../words/page.module.css';

const STATUS_TONE = {
  ACTIVE: 'positive',
  INACTIVE: 'neutral',
} as const;

export default function CategoriesPage() {
  const { admin } = useAuth();
  const canWrite = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: items = [], isLoading, isError, error, isFetching } = useCategories();

  // Client-side search across the unpaginated list (admin endpoint returns all)
  const filtered = items.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div>
          <div className={styles.cellPrimary}>{row.name}</div>
          <div className={styles.cellSecondary}>{row.description || '—'}</div>
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (row) => <code style={{ fontSize: 12 }}>{row.slug}</code>,
    },
    {
      key: 'icon',
      header: 'Icon',
      render: (row) => row.icon ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Pill tone={STATUS_TONE[row.status]}>{row.status}</Pill>,
      width: '120px',
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
        </div>
      ),
      width: '120px',
      sticky: true,
    },
  ];

  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CONTENT</p>
          <h1>Categories</h1>
          <p className={styles.subtitle}>
            Organize words and phrases. To retire a category, switch it to <strong>Inactive</strong> — existing entries keep their reference.
          </p>
        </div>
      </header>

      {isError && (
        <div className={styles.errorBox}>
          Could not load categories: {extractErrorMessage(error, 'unknown error')}
        </div>
      )}

      <Card>
        <ResourceTable
          rows={pageItems}
          columns={columns}
          getKey={(r) => r._id}
          loading={isLoading || isFetching}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          search={{ value: search, onChange: (next) => { setSearch(next); setPage(1); } }}
          toolbarAction={
            canWrite && (
              <Button onClick={() => setCreating(true)}>New category</Button>
            )
          }
          empty="No categories match your search."
        />
      </Card>

      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit category' : 'Add a category'}
        description="Slug is generated from the name; you can override it."
        size="md"
      >
        <CategoryForm
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
