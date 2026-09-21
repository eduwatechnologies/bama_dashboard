'use client';

import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { useCreateAd, useUpdateAd, type AdInput } from '@/lib/hooks';
import { Field } from './Field';
import { Button } from './Button';
import { extractFieldErrors, extractErrorMessage } from '@/lib/api';
import type { Ad, AdStatus, AdType, GoogleAdFormat } from '@/lib/types';
import styles from './AdsForm.module.css';

const AD_TYPES: AdType[] = ['GOOGLE', 'PERSONAL'];
const AD_STATUSES: AdStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];
const GOOGLE_FORMATS: GoogleAdFormat[] = ['BANNER', 'INTERSTITIAL', 'REWARDED', 'NATIVE'];

interface FormValues {
  name: string;
  type: AdType;
  placement: string;
  status: AdStatus;
  priority: string;
  startsAt: string;
  endsAt: string;
  googleAdUnitId: string;
  googleFormat: GoogleAdFormat;
  googleTestMode: boolean;
  personalTitle: string;
  personalBody: string;
  personalImageUrl: string;
  personalTargetUrl: string;
  personalCtaText: string;
}

const initialValues: FormValues = {
  name: '',
  type: 'GOOGLE',
  placement: '',
  status: 'DRAFT',
  priority: '0',
  startsAt: '',
  endsAt: '',
  googleAdUnitId: '',
  googleFormat: 'BANNER',
  googleTestMode: false,
  personalTitle: '',
  personalBody: '',
  personalImageUrl: '',
  personalTargetUrl: '',
  personalCtaText: '',
};

const optionalDate = Yup.string().optional().test(
  'valid-date',
  'Enter a valid date and time.',
  (value) => !value || !Number.isNaN(Date.parse(value)),
);

const optionalUrl = Yup.string()
  .transform((value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  .url('Enter a valid URL.')
  .max(2000)
  .optional();

const schema = Yup.object({
  name: Yup.string().trim().min(1, 'Name is required.').max(100, 'Keep the name under 100 characters.').required('Name is required.'),
  type: Yup.string().oneOf(AD_TYPES, 'Choose an ad provider.').required('Choose an ad provider.'),
  placement: Yup.string().trim().min(1, 'Placement is required.').max(80, 'Keep the placement under 80 characters.').required('Placement is required.'),
  status: Yup.string().oneOf(AD_STATUSES, 'Choose a valid status.').required('Choose a valid status.'),
  priority: Yup.number()
    .transform((value) => (value === '' ? undefined : value))
    .typeError('Priority must be a number.')
    .integer('Priority must be a whole number.')
    .min(0, 'Priority cannot be negative.')
    .max(1000, 'Priority cannot exceed 1000.')
    .required('Priority is required.'),
  startsAt: optionalDate,
  endsAt: optionalDate,
  googleAdUnitId: Yup.string().trim().max(100, 'Keep the ad unit ID under 100 characters.').optional(),
  googleFormat: Yup.string().oneOf(GOOGLE_FORMATS, 'Choose a Google ad format.').optional(),
  googleTestMode: Yup.boolean().required(),
  personalTitle: Yup.string().trim().max(100, 'Keep the title under 100 characters.').optional(),
  personalBody: Yup.string().trim().max(500, 'Keep the body under 500 characters.').optional(),
  personalImageUrl: optionalUrl,
  personalTargetUrl: optionalUrl,
  personalCtaText: Yup.string().trim().max(30, 'Keep the CTA under 30 characters.').optional(),
})
  .test('google-required', 'Complete the Google ad details.', function (values) {
    if (values.type !== 'GOOGLE') return true;
    if (!(values.googleAdUnitId ?? '').trim()) {
      return this.createError({ path: 'googleAdUnitId', message: 'Google ad unit ID is required.' });
    }
    if (!values.googleFormat) {
      return this.createError({ path: 'googleFormat', message: 'Choose a Google ad format.' });
    }
    return true;
  })
  .test('personal-required', 'Complete the personal ad details.', function (values) {
    if (values.type !== 'PERSONAL') return true;
    if (!(values.personalTitle ?? '').trim()) {
      return this.createError({ path: 'personalTitle', message: 'Title is required.' });
    }
    if (!(values.personalBody ?? '').trim()) {
      return this.createError({ path: 'personalBody', message: 'Body is required.' });
    }
    return true;
  })
  .test('schedule', 'End date must be later than the start date.', function (values) {
    if (!values.startsAt || !values.endsAt) return true;
    return new Date(values.endsAt).getTime() > new Date(values.startsAt).getTime();
  });

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toApiDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function fromAd(ad: Ad): FormValues {
  return {
    name: ad.name,
    type: ad.type,
    placement: ad.placement,
    status: ad.status,
    priority: String(ad.priority ?? 0),
    startsAt: toDateTimeLocal(ad.startsAt),
    endsAt: toDateTimeLocal(ad.endsAt),
    googleAdUnitId: ad.google?.adUnitId ?? '',
    googleFormat: ad.google?.format ?? 'BANNER',
    googleTestMode: ad.google?.testMode ?? false,
    personalTitle: ad.personal?.title ?? '',
    personalBody: ad.personal?.body ?? '',
    personalImageUrl: ad.personal?.imageUrl ?? '',
    personalTargetUrl: ad.personal?.targetUrl ?? '',
    personalCtaText: ad.personal?.ctaText ?? '',
  };
}

function toInput(values: FormValues): AdInput {
  const common = {
    name: values.name.trim(),
    type: values.type,
    placement: values.placement.trim().toUpperCase(),
    status: values.status,
    priority: Number(values.priority),
    startsAt: toApiDate(values.startsAt),
    endsAt: toApiDate(values.endsAt),
  };

  if (values.type === 'GOOGLE') {
    return {
      ...common,
      google: {
        adUnitId: values.googleAdUnitId.trim(),
        format: values.googleFormat,
        testMode: values.googleTestMode,
      },
    };
  }

  return {
    ...common,
    personal: {
      title: values.personalTitle.trim(),
      body: values.personalBody.trim(),
      imageUrl: values.personalImageUrl.trim() || undefined,
      targetUrl: values.personalTargetUrl.trim() || undefined,
      ctaText: values.personalCtaText.trim() || undefined,
    },
  };
}

const FIELD_PATHS: Record<string, string> = {
  'google.adUnitId': 'googleAdUnitId',
  'google.format': 'googleFormat',
  'personal.title': 'personalTitle',
  'personal.body': 'personalBody',
  'personal.imageUrl': 'personalImageUrl',
  'personal.targetUrl': 'personalTargetUrl',
  'personal.ctaText': 'personalCtaText',
};

interface AdsFormProps {
  initial?: Ad;
  onDone: () => void;
}

export function AdsForm({ initial, onDone }: AdsFormProps) {
  const create = useCreateAd();
  const update = useUpdateAd();
  const isEdit = Boolean(initial);
  const baseValues = initial ? fromAd(initial) : initialValues;

  return (
    <Formik
      enableReinitialize
      initialValues={baseValues}
      validationSchema={schema}
      onSubmit={async (values, helpers) => {
        const input = toInput(values);
        try {
          if (initial) {
            await update.mutateAsync({ id: initial._id, input });
          } else {
            await create.mutateAsync(input);
          }
          onDone();
        } catch (err) {
          const fields = extractFieldErrors(err);
          if (fields) {
            fields.forEach((field) => {
              helpers.setFieldError(FIELD_PATHS[field.field] ?? field.field, field.message);
            });
          }
          helpers.setStatus({ form: extractErrorMessage(err, 'Could not save the ad.') });
        } finally {
          helpers.setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, values, setFieldValue, status: formStatus }) => (
        <Form className={styles.form}>
          <div className={styles.grid}>
            <Field name="name" label="Name" placeholder="e.g. Home banner" />
            <label className={styles.field}>
              <span className={styles.label}>Provider</span>
              <Field as="select" name="type" label="" disabled={isEdit}>
                {AD_TYPES.map((type) => (
                  <option key={type} value={type}>{type === 'GOOGLE' ? 'Google Ads' : 'Personal ad'}</option>
                ))}
              </Field>
            </label>
          </div>

          <div className={styles.grid}>
            <Field name="placement" label="Placement" placeholder="e.g. HOME_TOP" hint="Used by the mobile app to choose where the ad appears." />
            <label className={styles.field}>
              <span className={styles.label}>Status</span>
              <Field as="select" name="status" label="">
                {AD_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Field>
            </label>
          </div>

          <div className={styles.grid}>
            <Field name="priority" label="Priority" type="number" min={0} max={1000} step={1} hint="Higher priority ads are returned first." />
            <div className={styles.fieldGroup}>
              <Field name="startsAt" label="Starts at" type="datetime-local" />
              <Field name="endsAt" label="Ends at" type="datetime-local" />
            </div>
          </div>

          {values.type === 'GOOGLE' ? (
            <section className={styles.provider}>
              <h3>Google Ads</h3>
              <div className={styles.grid}>
                <Field name="googleAdUnitId" label="Ad unit ID" placeholder="ca-app-pub-0000000000000000/0000000000" />
                <label className={styles.field}>
                  <span className={styles.label}>Format</span>
                  <Field as="select" name="googleFormat" label="">
                    {GOOGLE_FORMATS.map((format) => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </Field>
                </label>
              </div>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={values.googleTestMode}
                  onChange={(event) => setFieldValue('googleTestMode', event.target.checked)}
                  disabled={isSubmitting}
                />
                <span>Use Google test ad units</span>
              </label>
            </section>
          ) : (
            <section className={styles.provider}>
              <h3>Personal ad</h3>
              <div className={styles.grid}>
                <Field name="personalTitle" label="Title" placeholder="Tell users what is new" />
                <Field name="personalCtaText" label="CTA text" placeholder="Learn more" />
              </div>
              <Field as="textarea" name="personalBody" label="Body" placeholder="Write the message shown in the app." />
              <div className={styles.grid}>
                <Field name="personalImageUrl" label="Image URL" type="url" placeholder="https://…" />
                <Field name="personalTargetUrl" label="Target URL" type="url" placeholder="https://…" />
              </div>
            </section>
          )}

          {formStatus?.form && <p className={styles.alert}>{formStatus.form}</p>}
          <div className={styles.actions}>
            <Button type="submit" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Create ad'}</Button>
            <Button type="button" variant="ghost" onClick={onDone} disabled={isSubmitting}>Cancel</Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
