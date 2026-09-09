'use client';

import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { useCategories, useCreatePhrase, useUpdatePhrase, type PhraseInput } from '@/lib/hooks';
import { Field } from './Field';
import { Button } from './Button';
import { AudioRecorderField } from './AudioRecorderField';
import { extractErrorMessage, extractFieldErrors } from '@/lib/api';
import type { ContentStatus, Phrase } from '@/lib/types';
import styles from './ContentForm.module.css';

const STATUS_OPTIONS: ContentStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

const schema = Yup.object({
  english: Yup.string().min(1, 'Required.').required('Required.'),
  hausa: Yup.string().min(1, 'Required.').required('Required.'),
  categoryId: Yup.string().required('Choose a category.'),
  audioUrl: Yup.string().url('Must be a valid URL.').optional(),
  status: Yup.string().oneOf(STATUS_OPTIONS).required(),
  recordedAudio: Yup.mixed().nullable().optional(),
});

interface FormValues {
  english: string;
  hausa: string;
  categoryId: string;
  audioUrl: string;
  status: ContentStatus;
  recordedAudio?: { url: string; storageKey?: string; mimeType?: string; sizeBytes?: number; duration?: number } | null;
}

function fromPhrase(phrase: Phrase): FormValues {
  return {
    english: phrase.english,
    hausa: phrase.hausa,
    categoryId: phrase.categoryId?._id ?? '',
    audioUrl: phrase.audio?.url ?? '',
    status: phrase.status,
    recordedAudio: phrase.audio
      ? { url: phrase.audio.url, storageKey: phrase.audio.storageKey, mimeType: phrase.audio.mimeType, sizeBytes: phrase.audio.size, duration: phrase.audio.duration }
      : null,
  };
}

const initialValues: FormValues = {
  english: '',
  hausa: '',
  categoryId: '',
  audioUrl: '',
  status: 'DRAFT',
  recordedAudio: null,
};

function toInput(values: FormValues): PhraseInput {
  const audio =
    values.recordedAudio?.url
      ? { url: values.recordedAudio.url, storageKey: values.recordedAudio.storageKey, mimeType: values.recordedAudio.mimeType, size: values.recordedAudio.sizeBytes, duration: values.recordedAudio.duration }
      : values.audioUrl.trim()
        ? { url: values.audioUrl.trim() }
        : undefined;

  return {
    english: values.english.trim(),
    hausa: values.hausa.trim(),
    categoryId: values.categoryId,
    audio,
    status: values.status,
  };
}

interface PhraseFormProps {
  initial?: Phrase;
  onDone: () => void;
}

export function PhraseForm({ initial, onDone }: PhraseFormProps) {
  const { data: categories = [] } = useCategories();
  const createPhrase = useCreatePhrase();
  const updatePhrase = useUpdatePhrase();
  const isEdit = Boolean(initial);
  const baseValues = initial ? fromPhrase(initial) : initialValues;

  return (
    <Formik
      enableReinitialize
      initialValues={baseValues}
      validationSchema={schema}
      onSubmit={async (values, helpers) => {
        const input = toInput(values);
        try {
          if (initial) {
            await updatePhrase.mutateAsync({ id: initial._id, input });
          } else {
            await createPhrase.mutateAsync(input);
          }
          onDone();
        } catch (err) {
          const fields = extractFieldErrors(err);
          if (fields) fields.forEach((f) => helpers.setFieldError(f.field, f.message));
          helpers.setStatus({ form: extractErrorMessage(err, 'Could not save the phrase.') });
        } finally {
          helpers.setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, setFieldValue, values, status: formStatus }) => (
        <Form className={styles.form}>
          <div className={styles.grid}>
            <Field name="english" label="English" placeholder="e.g. How are you?" />
            <Field name="hausa" label="Hausa" placeholder="e.g. Yaya kake?" />
          </div>
          <label className={styles.field}>
            <span className={styles.label}>Category</span>
            <Field as="select" name="categoryId" label="">
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Field>
          </label>
          <Field name="audioUrl" label="Audio URL" placeholder="https://…" hint="Paste an existing URL, or record one below." />
          <AudioRecorderField
            label="Record audio"
            hint="Speak the phrase clearly. Max 15s. Saved directly to Cloudinary."
            value={(values.recordedAudio as typeof initialValues.recordedAudio) ?? null}
            onChange={(next) => {
              setFieldValue('recordedAudio', next);
              if (next?.url) {
                setFieldValue('audioUrl', next.url);
              }
            }}
            disabled={isSubmitting}
          />
          <label className={styles.field}>
            <span className={styles.label}>Status</span>
            <Field as="select" name="status" label="">
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Field>
          </label>
          {formStatus?.form && <p className={styles.alert}>{formStatus.form}</p>}
          <div className={styles.actions}>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create phrase'}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
