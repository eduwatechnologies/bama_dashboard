'use client';

import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { useCategories, useCreateWord, useUpdateWord, type WordInput } from '@/lib/hooks';
import { Field } from './Field';
import { Button } from './Button';
import { AudioRecorderField } from './AudioRecorderField';
import type { ContentStatus, Word } from '@/lib/types';
import { extractFieldErrors, extractErrorMessage } from '@/lib/api';
import styles from './ContentForm.module.css';

const STATUS_OPTIONS: ContentStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

const schema = Yup.object({
  english: Yup.string().min(1, 'Required.').required('Required.'),
  hausa: Yup.string().min(1, 'Required.').required('Required.'),
  categoryId: Yup.string().required('Choose a category.'),
  description: Yup.string().max(500, 'Keep it under 500 characters.'),
  exampleEnglish: Yup.string().max(200),
  exampleHausa: Yup.string().max(200),
  audioUrl: Yup.string(),
  status: Yup.string().oneOf(STATUS_OPTIONS).required(),
});

interface FormValues {
  english: string;
  hausa: string;
  categoryId: string;
  description: string;
  exampleEnglish: string;
  exampleHausa: string;
  audioUrl: string;
  status: ContentStatus;
  recordedAudio?: { url: string; storageKey?: string; mimeType?: string; sizeBytes?: number; duration?: number } | null;
}

function fromWord(word: Word): FormValues {
  return {
    english: word.english,
    hausa: word.hausa,
    categoryId: word.categoryId?._id ?? '',
    description: word.description ?? '',
    exampleEnglish: word.exampleSentence?.english ?? '',
    exampleHausa: word.exampleSentence?.hausa ?? '',
    audioUrl: word.audio?.url ?? '',
    status: word.status,
    recordedAudio: word.audio
      ? { url: word.audio.url, storageKey: word.audio.storageKey, mimeType: word.audio.mimeType, sizeBytes: word.audio.size, duration: word.audio.duration }
      : null,
  };
}

const initialValues: FormValues = {
  english: '',
  hausa: '',
  categoryId: '',
  description: '',
  exampleEnglish: '',
  exampleHausa: '',
  audioUrl: '',
  status: 'DRAFT',
  recordedAudio: null,
};

function toInput(values: FormValues): WordInput {
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
    description: values.description.trim() || undefined,
    exampleSentence:
      values.exampleEnglish.trim() || values.exampleHausa.trim()
        ? {
            english: values.exampleEnglish.trim() || undefined,
            hausa: values.exampleHausa.trim() || undefined,
          }
        : undefined,
    audio,
    status: values.status,
  };
}

interface ContentFormProps {
  initial?: Word;
  onDone: () => void;
}

export function ContentForm({ initial, onDone }: ContentFormProps) {
  const { data: categories = [] } = useCategories();
  const createWord = useCreateWord();
  const updateWord = useUpdateWord();

  const isEdit = Boolean(initial);
  const baseValues = initial ? fromWord(initial) : initialValues;

  return (
    <Formik
      enableReinitialize
      initialValues={baseValues}
      validationSchema={schema}
      onSubmit={async (values, helpers) => {
        const input = toInput(values);
        try {
          if (initial) {
            await updateWord.mutateAsync({ id: initial._id, input });
          } else {
            await createWord.mutateAsync(input);
          }
          onDone();
        } catch (err) {
          const fields = extractFieldErrors(err);
          if (fields) {
            fields.forEach((f) => helpers.setFieldError(f.field, f.message));
          }
          helpers.setStatus({ form: extractErrorMessage(err, 'Could not save the word.') });
        } finally {
          helpers.setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, setFieldValue, values, status: formStatus }) => (
        <Form className={styles.form}>
          <div className={styles.grid}>
            <Field name="english" label="English" placeholder="e.g. Water" />
            <Field name="hausa" label="Hausa" placeholder="e.g. Ruwa" />
          </div>
          <label className={styles.field}>
            <span className={styles.label}>Category</span>
            <FieldSelect name="categoryId" options={categories.map((c) => ({ value: c._id, label: c.name }))} placeholder="Select a category" />
          </label>
          <Field name="description" label="Description" placeholder="Optional context for editors" />
          <div className={styles.grid}>
            <Field name="exampleEnglish" label="Example · English" placeholder="Give me water." />
            <Field name="exampleHausa" label="Example · Hausa" placeholder="Ba ni ruwa." />
          </div>
          <Field name="audioUrl" label="Audio URL" placeholder="https://…" hint="Paste an existing URL, or record one below." />
          <AudioRecorderField
            label="Record audio"
            hint="Speak the word clearly. Max 15s. Saved directly to Cloudinary."
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
            <FieldSelect name="status" options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))} />
          </label>
          {formStatus?.form && <p className={styles.alert}>{formStatus.form}</p>}
          <div className={styles.actions}>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create word'}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}

interface FieldSelectProps {
  name: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function FieldSelect({ name, options, placeholder }: FieldSelectProps) {
  return (
    <Field
      as="select"
      name={name}
      leadingIcon={null}
      label=""
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Field>
  );
}
