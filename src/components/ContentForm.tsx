'use client';

import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import {
  useActiveLanguages,
  useCategories,
  useCreateWord,
  useUpdateWord,
  type WordInput,
} from '@/lib/hooks';
import { Field } from './Field';
import { Button } from './Button';
import { AudioRecorderField } from './AudioRecorderField';
import { Tabs } from './Tabs';
import type { ContentStatus, Word } from '@/lib/types';
import { extractFieldErrors, extractErrorMessage } from '@/lib/api';
import styles from './ContentForm.module.css';

const STATUS_OPTIONS: ContentStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

type RecordedAudio = { url: string; storageKey?: string; mimeType?: string; sizeBytes?: number; duration?: number } | null;

interface FormValues {
  translations: Record<string, string>;
  categoryId: string;
  description: string;
  exampleSentence: Record<string, string>;
  audioUrls: Record<string, string>;
  recordedAudio: Record<string, RecordedAudio>;
  status: ContentStatus;
}

function buildInitialValues(activeLangs: Array<{ code: string }>): FormValues {
  const translations: Record<string, string> = {};
  const exampleSentence: Record<string, string> = {};
  const audioUrls: Record<string, string> = {};
  const recordedAudio: Record<string, RecordedAudio> = {};
  activeLangs.forEach((l) => {
    translations[l.code] = '';
    exampleSentence[l.code] = '';
    audioUrls[l.code] = '';
    recordedAudio[l.code] = null;
  });
  return {
    translations,
    categoryId: '',
    description: '',
    exampleSentence,
    audioUrls,
    recordedAudio,
    status: 'DRAFT',
  };
}

function fromWord(word: Word, activeLangs: Array<{ code: string }>): FormValues {
  const base = buildInitialValues(activeLangs);
  base.translations = { ...base.translations, ...(word.translations ?? {}) };
  base.categoryId = word.categoryId?._id ?? '';
  base.description = word.description ?? '';
  base.exampleSentence = { ...base.exampleSentence, ...(word.exampleSentence ?? {}) };
  base.status = word.status;

  Object.entries(word.audio ?? {}).forEach(([code, audio]: [string, any]) => {
    const url = typeof audio === 'string' ? audio : audio?.url;
    if (url) {
      base.audioUrls[code] = url;
      const meta = typeof audio === 'object' && audio ? audio : {};
      base.recordedAudio[code] = {
        url,
        storageKey: meta.storageKey,
        mimeType: meta.mimeType,
        sizeBytes: meta.size,
        duration: meta.duration,
      };
    }
  });
  return base;
}

function toInput(values: FormValues): WordInput {
  const translations: Record<string, string> = {};
  Object.entries(values.translations).forEach(([code, text]) => {
    const trimmed = text.trim();
    if (trimmed) translations[code] = trimmed;
  });

  const exampleSentence: Record<string, string> = {};
  Object.entries(values.exampleSentence).forEach(([code, text]) => {
    const trimmed = text.trim();
    if (trimmed) exampleSentence[code] = trimmed;
  });

  const audio: WordInput['audio'] = {};
  Object.entries(values.translations).forEach(([code]) => {
    const recorded = values.recordedAudio[code];
    const url = recorded?.url ?? values.audioUrls[code]?.trim();
    if (recorded) {
      audio[code] = {
        url: recorded.url,
        storageKey: recorded.storageKey,
        mimeType: recorded.mimeType,
        size: recorded.sizeBytes,
        duration: recorded.duration,
      };
    } else if (url) {
      audio[code] = { url };
    }
  });

  return {
    translations,
    categoryId: values.categoryId,
    description: values.description.trim() || undefined,
    exampleSentence: Object.keys(exampleSentence).length ? exampleSentence : undefined,
    audio: Object.keys(audio).length ? audio : undefined,
    status: values.status,
  };
}

interface ContentFormProps {
  initial?: Word;
  onDone: () => void;
}

export function ContentForm({ initial, onDone }: ContentFormProps) {
  const { data: categories = [] } = useCategories();
  const { data: activeLanguages = [], isLoading: langsLoading } = useActiveLanguages();
  const createWord = useCreateWord();
  const updateWord = useUpdateWord();

  const isEdit = Boolean(initial);

  if (langsLoading) {
    return <div className={styles.form}>Loading languages…</div>;
  }

  const schema = Yup.object({
    translations: Yup.object(
      activeLanguages.reduce<Record<string, Yup.StringSchema>>((acc, l) => {
        acc[l.code] = Yup.string().min(1, 'Required.').required('Required.');
        return acc;
      }, {}),
    ),
    categoryId: Yup.string().required('Choose a category.'),
    description: Yup.string().max(500, 'Keep it under 500 characters.'),
    exampleSentence: Yup.object(
      activeLanguages.reduce<Record<string, Yup.StringSchema>>((acc, l) => {
        acc[l.code] = Yup.string().max(200);
        return acc;
      }, {}),
    ),
    status: Yup.string().oneOf(STATUS_OPTIONS).required(),
  });

  const baseValues = initial ? fromWord(initial, activeLanguages) : buildInitialValues(activeLanguages);

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
            {activeLanguages.map((l) => (
              <Field
                key={l.code}
                name={`translations.${l.code}`}
                label={`${l.name} (${l.code})`}
                placeholder={l.code === 'en' ? 'e.g. Water' : `Translation in ${l.name}`}
              />
            ))}
          </div>
          <label className={styles.field}>
            <span className={styles.label}>Category</span>
            <FieldSelect name="categoryId" options={categories.map((c) => ({ value: c._id, label: c.name }))} placeholder="Select a category" />
          </label>
          <Field name="description" label="Description" placeholder="Optional context for editors" />
          <div className={styles.grid}>
            {activeLanguages.map((l) => (
              <Field
                key={l.code}
                name={`exampleSentence.${l.code}`}
                label={`Example · ${l.name}`}
                placeholder={l.code === 'en' ? 'Give me water.' : `Example in ${l.name}`}
              />
            ))}
          </div>
          {activeLanguages.length > 0 && (
            <Tabs
              tabs={activeLanguages.map((l) => ({
                id: l.code,
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{l.flag}</span>
                    <span>{l.name}</span>
                  </span>
                ),
              }))}
            >
              {(tabId) => {
                const l = activeLanguages.find((lang) => lang.code === tabId) ?? activeLanguages[0];
                return (
                  <div className={styles.field}>
                    <Field
                      name={`audioUrls.${l.code}`}
                      label={`Audio URL · ${l.name}`}
                      placeholder="https://…"
                      hint="Paste an existing URL, or record one below."
                    />
                    <AudioRecorderField
                      label={`Record audio · ${l.name}`}
                      hint={`Speak the word in ${l.name}. Max 15s. Saved directly to Cloudinary.`}
                      value={(values.recordedAudio[l.code] as RecordedAudio) ?? null}
                      onChange={(next) => {
                        setFieldValue(`recordedAudio.${l.code}`, next);
                        if (next?.url) {
                          setFieldValue(`audioUrls.${l.code}`, next.url);
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </div>
                );
              }}
            </Tabs>
          )}
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
