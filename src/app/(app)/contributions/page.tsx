'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  useApproveContribution,
  useCategories,
  useContribution,
  useContributions,
  useMarkUnderReview,
  useRejectContribution,
  useResolveContribution,
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
  IssueCategory,
  ReportKind,
} from '@/lib/types';
import styles from './page.module.css';
import detailStyles from './contributionDetail.module.css';

const STATUS_FILTERS: { value: '' | ContributionStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'RESOLVED', label: 'Resolved' },
];

const TYPE_FILTERS: { value: '' | ContributionType; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'WORD', label: 'Word' },
  { value: 'PHRASE', label: 'Phrase' },
  { value: 'TRANSLATION', label: 'Translation' },
  { value: 'CORRECTION', label: 'Correction' },
  { value: 'AUDIO', label: 'Audio' },
];

const REPORT_KIND_LABELS: Record<ReportKind, string> = {
  PRONUNCIATION: 'Pronunciation',
  TRANSLATION: 'Translation',
  ENGLISH: 'English',
  PROBLEM: 'Problem',
};

const ISSUE_LABELS: Record<IssueCategory, string> = {
  DUPLICATE: 'Duplicate',
  WRONG_CATEGORY: 'Wrong category',
  OFFENSIVE: 'Offensive',
  INACCURATE: 'Inaccurate',
  BROKEN_AUDIO: 'Broken audio',
  OTHER: 'Other',
};

const REPORT_KIND_FILTERS: { value: '' | ReportKind; label: string }[] = [
  { value: '', label: 'All reports' },
  ...(Object.keys(REPORT_KIND_LABELS) as ReportKind[]).map((key) => ({
    value: key,
    label: REPORT_KIND_LABELS[key],
  })),
];

const ISSUE_FILTERS: { value: '' | IssueCategory; label: string }[] = [
  { value: '', label: 'All issues' },
  ...(Object.keys(ISSUE_LABELS) as IssueCategory[]).map((key) => ({
    value: key,
    label: ISSUE_LABELS[key],
  })),
];

const ACTIONABLE_FILTERS: { value: '' | 'true' | 'false'; label: string }[] = [
  { value: '', label: 'Publishable and reports' },
  { value: 'true', label: 'Publishable only' },
  { value: 'false', label: 'Needs a decision' },
];

const STATUS_TONE: Record<ContributionStatus, 'positive' | 'warning' | 'critical' | 'neutral' | 'accent'> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'accent',
  APPROVED: 'positive',
  REJECTED: 'critical',
  RESOLVED: 'neutral',
};

export default function ContributionsPage() {
  const { admin } = useAuth();
  const canReview = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN' || admin?.role === 'MODERATOR';

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<'' | ContributionStatus>('');
  const [type, setType] = useState<'' | ContributionType>('');
  const [reportKind, setReportKind] = useState<'' | ReportKind>('');
  const [issueCategory, setIssueCategory] = useState<'' | IssueCategory>('');
  const [actionable, setActionable] = useState<'' | 'true' | 'false'>('');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data, isLoading, isError, error, isFetching } = useContributions({
    page,
    limit: pageSize,
    status: status || undefined,
    type: type || undefined,
    reportKind: reportKind || undefined,
    issueCategory: issueCategory || undefined,
    ...(actionable ? { actionable: actionable === 'true' } : {}),
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.items;
    return data.items.filter((c) => {
      const blob = `${c.english ?? ''} ${c.hausa ?? ''} ${c.suggestedEnglish ?? ''} ${c.suggestedHausa ?? ''} ${c.reason ?? ''} ${c.contentSnapshot?.english ?? ''}`.toLowerCase();
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
      key: 'report',
      header: 'Report',
      render: (row) =>
        row.reportKind ? (
          <div className={styles.cellStack}>
            <Pill tone="neutral">{REPORT_KIND_LABELS[row.reportKind]}</Pill>
            {row.issueCategory && (
              <span className={styles.cellMuted}>{ISSUE_LABELS[row.issueCategory]}</span>
            )}
          </div>
        ) : (
          <span className={styles.cellMuted}>—</span>
        ),
      width: '170px',
    },
    {
      key: 'preview',
      header: 'Submission',
      render: (row) => {
        const primary =
          row.english ??
          row.suggestedEnglish ??
          row.contentSnapshot?.english ??
          row.contentId ??
          row._id;
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
      sticky: true,
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
              reportKind={reportKind}
              onReportKindChange={(next) => {
                setReportKind(next as '' | ReportKind);
                setPage(1);
              }}
              issueCategory={issueCategory}
              onIssueCategoryChange={(next) => {
                setIssueCategory(next as '' | IssueCategory);
                setPage(1);
              }}
              actionable={actionable}
              onActionableChange={(next) => {
                setActionable(next as '' | 'true' | 'false');
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

function FilterToolbar({
  type,
  onTypeChange,
  reportKind,
  onReportKindChange,
  issueCategory,
  onIssueCategoryChange,
  actionable,
  onActionableChange,
}: {
  type: string;
  onTypeChange: (next: string) => void;
  reportKind: string;
  onReportKindChange: (next: string) => void;
  issueCategory: string;
  onIssueCategoryChange: (next: string) => void;
  actionable: string;
  onActionableChange: (next: string) => void;
}) {
  return (
    <div className={styles.filterGroup}>
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
      <label className={styles.filterInline}>
        <span>Report</span>
        <select value={reportKind} onChange={(e) => onReportKindChange(e.target.value)}>
          {REPORT_KIND_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.filterInline}>
        <span>Issue</span>
        <select value={issueCategory} onChange={(e) => onIssueCategoryChange(e.target.value)}>
          {ISSUE_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.filterInline}>
        <span>Queue</span>
        <select value={actionable} onChange={(e) => onActionableChange(e.target.value)}>
          {ACTIONABLE_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
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

const resolveSchema = Yup.object({
  reviewNotes: Yup.string()
    .min(4, 'Add a short note.')
    .required('Say what you changed so the queue stays useful.'),
  categoryId: Yup.string().notRequired(),
});

function ContributionDetail({ id, onClose, canReview }: ContributionDetailProps) {
  const { data, isLoading, isError, error } = useContribution(id);
  const markUnderReview = useMarkUnderReview();
  const approve = useApproveContribution();
  const reject = useRejectContribution();
  const resolve = useResolveContribution();
  const { data: categories } = useCategories();

  const referencedType =
    data && (data.type === 'TRANSLATION' || data.type === 'CORRECTION' || data.type === 'AUDIO')
      ? data.contentType === 'word'
        ? 'WORD'
        : data.contentType === 'phrase'
          ? 'PHRASE'
          : null
      : null;

  const { data: referenced } = useReferencedContent(referencedType, data?.contentId ?? null);

  // The server decides this: a report that only describes a fault has nothing
  // to publish, so it gets resolved (or rejected) instead of approved.
  const needsDecision = data ? data.actionable === false : false;
  const openForReview = data ? data.status === 'PENDING' || data.status === 'UNDER_REVIEW' : false;

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
            {data.reportKind && (
              <Pill tone="neutral">{REPORT_KIND_LABELS[data.reportKind]} report</Pill>
            )}
            {data.issueCategory && (
              <Pill tone="warning">{ISSUE_LABELS[data.issueCategory]}</Pill>
            )}
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
                {data.contentSnapshot &&
                  (data.contentSnapshot.english !== referenced.english ||
                    data.contentSnapshot.hausa !== referenced.hausa) && (
                    <p className={detailStyles.muted}>
                      Changed since this report was filed: “{data.contentSnapshot.english}” / “
                      {data.contentSnapshot.hausa}”.
                    </p>
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
              {!needsDecision && (
                <Button
                  onClick={() => approve.mutate({ id })}
                  loading={approve.isPending}
                >
                  Approve & publish
                </Button>
              )}
            </div>
          )}
          {needsDecision && openForReview && (
            <p className={detailStyles.muted}>
              This report describes a problem instead of proposing wording, so there is nothing to
              publish. Fix the content, then resolve the report.
            </p>
          )}
          {canReview && needsDecision && openForReview && (
            <Formik
              initialValues={{ reviewNotes: '', categoryId: '' }}
              validationSchema={resolveSchema}
              onSubmit={async (values, helpers) => {
                try {
                  await resolve.mutateAsync({
                    id,
                    reviewNotes: values.reviewNotes,
                    categoryId: values.categoryId || undefined,
                  });
                  onClose();
                } catch (err) {
                  helpers.setStatus({ form: extractErrorMessage(err, 'Could not resolve.') });
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
                    label="What did you fix?"
                    placeholder="Moved the phrase to Daily conversation, removed the duplicate…"
                  />
                  {data.reportKind === 'PROBLEM' && (
                    <Field as="select" name="categoryId" label="Move to category">
                      <option value="">Leave the category unchanged</option>
                      {(categories ?? []).map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </Field>
                  )}
                  {status?.form && <p className={styles.errorBox}>{status.form}</p>}
                  <div className={detailStyles.actions}>
                    <Button type="submit" loading={isSubmitting || resolve.isPending}>
                      Resolve report
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
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
          {data.status === 'RESOLVED' && (
            <p className={detailStyles.muted}>
              Resolved{data.reviewedAt ? ` ${formatRelative(data.reviewedAt)}` : ''}
              {data.reviewNotes ? ` — “${data.reviewNotes}”` : ''}.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
