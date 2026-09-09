'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  useApproveContribution,
  useContribution,
  useContributions,
  useMarkUnderReview,
  useRejectContribution,
  useReferencedContent,
} from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ResourceTable, type Column } from '@/components/ResourceTable';
import { Pill } from '@/components/Pill';
import { Field } from '@/components/Field';
import { ReadOnlyField } from '@/components/ReadOnlyField';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { extractErrorMessage } from '@/lib/api';
import { formatRelative } from '@/lib/format';
import type {
  Contribution,
  ContributionStatus,
  ContributionType,
} from '@/lib/types';
import styles from './page.module.css';
import detailStyles from './contributionDetail.module.css';

const STATUS_FILTERS: { value: '' | ContributionStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const TYPE_FILTERS: { value: '' | ContributionType; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'WORD', label: 'Word' },
  { value: 'PHRASE', label: 'Phrase' },
  { value: 'TRANSLATION', label: 'Translation' },
  { value: 'CORRECTION', label: 'Correction' },
  { value: 'AUDIO', label: 'Audio' },
];

const STATUS_TONE: Record<ContributionStatus, 'positive' | 'warning' | 'critical' | 'neutral' | 'accent'> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'accent',
  APPROVED: 'positive',
  REJECTED: 'critical',
};

export default function ContributionsPage() {
  const { admin } = useAuth();
  const canReview = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN' || admin?.role === 'MODERATOR';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<'' | ContributionStatus>('');
  const [type, setType] = useState<'' | ContributionType>('');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data, isLoading, isError, error, isFetching } = useContributions({
    page,
    limit: pageSize,
    status: status || undefined,
    type: type || undefined,
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.items;
    return data.items.filter((c) => {
      const blob = `${c.english ?? ''} ${c.hausa ?? ''} ${c.suggestedEnglish ?? ''} ${c.suggestedHausa ?? ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [data, search]);

  const columns: Column<Contribution>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (row) => <Pill tone="neutral">{row.type}</Pill>,
      width: '110px',
    },
    {
      key: 'preview',
      header: 'Submission',
      render: (row) => {
        const primary = row.english ?? row.suggestedEnglish ?? row.contentId ?? row._id;
        const secondary = row.hausa ?? row.suggestedHausa ?? row.reason ?? '—';
        return (
          <div>
            <div className={styles.cellPrimary}>{primary}</div>
            <div className={styles.cellSecondary}>{secondary}</div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Pill tone={STATUS_TONE[row.status]}>{row.status.replace('_', ' ')}</Pill>,
      width: '160px',
    },
    {
      key: 'created',
      header: 'Submitted',
      render: (row) => <span className={styles.cellMuted}>{formatRelative(row.createdAt)}</span>,
      width: '140px',
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className={styles.rowActions}>
          <Button size="sm" variant="secondary" onClick={() => setActiveId(row._id)}>
            Open
          </Button>
        </div>
      ),
      width: '120px',
    },
  ];

  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>MODERATION</p>
          <h1>Review queue</h1>
          <p className={styles.subtitle}>
            Approve or reject community submissions. Approving publishes the change and bumps the content version.
          </p>
        </div>
      </header>

      {isError && (
        <div className={styles.errorBox}>
          Could not load contributions: {extractErrorMessage(error, 'unknown error')}
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
          search={{ value: search, onChange: setSearch, placeholder: 'Search submissions…' }}
          filter={{
            label: 'Status',
            value: status,
            onChange: (next) => {
              setStatus(next as '' | ContributionStatus);
              setPage(1);
            },
            options: STATUS_FILTERS.map((opt) => ({ value: opt.value, label: opt.label })),
          }}
          toolbarAction={
            <FilterToolbar
              type={type}
              onTypeChange={(next) => {
                setType(next as '' | ContributionType);
                setPage(1);
              }}
            />
          }
          empty="No submissions in this view."
        />
      </Card>

      <ContributionDetail id={activeId} onClose={() => setActiveId(null)} canReview={canReview} />
    </>
  );
}

function FilterToolbar({ type, onTypeChange }: { type: string; onTypeChange: (next: string) => void }) {
  return (
    <label className={styles.filterInline}>
      <span>Type</span>
      <select value={type} onChange={(e) => onTypeChange(e.target.value)}>
        {TYPE_FILTERS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ContributionDetailProps {
  id: string | null;
  onClose: () => void;
  canReview: boolean;
}

const rejectSchema = Yup.object({
  reviewNotes: Yup.string().min(4, 'Add a short reason.').required('Reason is required to reject.'),
});

function ContributionDetail({ id, onClose, canReview }: ContributionDetailProps) {
  const { data, isLoading, isError, error } = useContribution(id);
  const markUnderReview = useMarkUnderReview();
  const approve = useApproveContribution();
  const reject = useRejectContribution();

  const referencedType =
    data && (data.type === 'TRANSLATION' || data.type === 'CORRECTION' || data.type === 'AUDIO')
      ? data.contentType === 'word'
        ? 'WORD'
        : data.contentType === 'phrase'
          ? 'PHRASE'
          : null
      : null;

  const { data: referenced } = useReferencedContent(referencedType, data?.contentId ?? null);

  if (!id) return null;

  return (
    <Modal open onClose={onClose} title="Contribution" description={id} size="lg">
      {isLoading && <p style={{ color: 'var(--muted-foreground)' }}>Loading…</p>}
      {isError && (
        <p className={styles.errorBox}>{extractErrorMessage(error, 'Could not load the contribution.')}</p>
      )}
      {data && (
        <div className={detailStyles.wrap}>
          <div className={detailStyles.metaRow}>
            <Pill tone="neutral">{data.type}</Pill>
            <Pill tone={STATUS_TONE[data.status]}>{data.status.replace('_', ' ')}</Pill>
            <span className={detailStyles.muted}>Submitted {formatRelative(data.createdAt)}</span>
            {data.installationId && (
              <span className={detailStyles.muted}>· device {data.installationId.slice(0, 8)}…</span>
            )}
          </div>

          <div className={detailStyles.compare}>
            <div className={detailStyles.card}>
              <h3>Submitted</h3>
              <ReadOnlyField label="English">{data.english ?? data.suggestedEnglish}</ReadOnlyField>
              <ReadOnlyField label="Hausa">{data.hausa ?? data.suggestedHausa}</ReadOnlyField>
              {data.reason && <ReadOnlyField label="Reason">{data.reason}</ReadOnlyField>}
              {data.notes && <ReadOnlyField label="Notes">{data.notes}</ReadOnlyField>}
              {data.audio?.url && (
                <div>
                  <p className={detailStyles.label}>Recording</p>
                  <audio controls src={data.audio.url} style={{ width: '100%' }} />
                </div>
              )}
            </div>
            {referenced && (
              <div className={detailStyles.card}>
                <h3>Currently published</h3>
                <ReadOnlyField label="English">{referenced.english}</ReadOnlyField>
                <ReadOnlyField label="Hausa">{referenced.hausa}</ReadOnlyField>
                <ReadOnlyField label="Status">{referenced.status}</ReadOnlyField>
                {referenced.audio?.url && (
                  <audio controls src={referenced.audio.url} style={{ width: '100%' }} />
                )}
              </div>
            )}
          </div>

          {canReview && data.status === 'PENDING' && (
            <div className={detailStyles.actions}>
              <Button
                variant="secondary"
                onClick={() => markUnderReview.mutate(id, { onSuccess: () => null })}
                loading={markUnderReview.isPending}
              >
                Mark under review
              </Button>
              <Button
                onClick={() => approve.mutate({ id })}
                loading={approve.isPending}
              >
                Approve & publish
              </Button>
            </div>
          )}
          {canReview && (data.status === 'UNDER_REVIEW' || data.status === 'PENDING') && (
            <Formik
              initialValues={{ reviewNotes: '' }}
              validationSchema={rejectSchema}
              onSubmit={async (values, helpers) => {
                try {
                  await reject.mutateAsync({ id, reviewNotes: values.reviewNotes });
                  onClose();
                } catch (err) {
                  helpers.setStatus({ form: extractErrorMessage(err, 'Could not reject.') });
                } finally {
                  helpers.setSubmitting(false);
                }
              }}
            >
              {({ isSubmitting, status }) => (
                <Form className={detailStyles.rejectForm}>
                  <Field
                    as="textarea"
                    name="reviewNotes"
                    label="Reject with a reason"
                    placeholder="Explain why this submission was rejected…"
                  />
                  {status?.form && <p className={styles.errorBox}>{status.form}</p>}
                  <div className={detailStyles.actions}>
                    <Button
                      variant="destructive"
                      type="submit"
                      loading={isSubmitting || reject.isPending}
                    >
                      Reject submission
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          )}

          {data.status === 'APPROVED' && (
            <p className={detailStyles.muted}>
              Approved{data.reviewedAt ? ` ${formatRelative(data.reviewedAt)}` : ''}.
              {data.resultContentId && ` Resulting content id: ${data.resultContentId}`}
            </p>
          )}
          {data.status === 'REJECTED' && (
            <p className={detailStyles.muted}>
              Rejected{data.reviewNotes ? ` — “${data.reviewNotes}”` : ''}.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
