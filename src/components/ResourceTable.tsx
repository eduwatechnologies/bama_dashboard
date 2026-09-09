'use client';

import type { ReactNode } from 'react';
import { Button } from './Button';
import styles from './ResourceTable.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  width?: string;
}

interface ResourceTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getKey: (row: T) => string;
  empty?: string;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  search?: { value: string; onChange: (next: string) => void; placeholder?: string };
  filter?: { value: string; onChange: (next: string) => void; options: { value: string; label: string }[]; label: string };
  toolbarAction?: ReactNode;
  loading?: boolean;
}

export function ResourceTable<T>({
  rows,
  columns,
  getKey,
  empty = 'No items yet.',
  page,
  pageSize,
  total,
  onPageChange,
  search,
  filter,
  toolbarAction,
  loading,
}: ResourceTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {search && (
            <div className={styles.search}>
              <span aria-hidden>⌕</span>
              <input
                type="search"
                placeholder={search.placeholder ?? 'Search…'}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
              />
            </div>
          )}
          {filter && (
            <label className={styles.filter}>
              <span>{filter.label}</span>
              <select value={filter.value} onChange={(e) => filter.onChange(e.target.value)}>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className={styles.toolbarRight}>{toolbarAction}</div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan={columns.length}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan={columns.length}>
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={getKey(row)}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pager}>
        <span className={styles.pagerInfo}>
          Page {page} of {totalPages} · {total} total
        </span>
        <div className={styles.pagerActions}>
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
