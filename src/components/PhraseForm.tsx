'use client';

import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import {
  useActiveLanguages,
  useCategories,
  useCreatePhrase,
  useUpdatePhrase,
  type PhraseInput,
} from '@/lib/hooks';
import { Field } from './Field';
import { Button } from './Button';
import { AudioRecorderField } from './AudioRecorderField';
import { Tabs } from './Tabs';
import { extractErrorMessage, extractFieldErrors } from '@/lib/api';
import type { ContentStatus, Phrase } from '@/lib/types';
import styles from './ContentForm.module.css';

const STATUS_OPTIONS: ContentStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

type RecordedAudio = { url: string; storageKey?: string; mimeType?: string; sizeBytes?: number; duration?: number } | null;

interface FormValues {
  translations: Record<string, string>;
  categoryId: string;
  audioUrls: Record<string, string>;
  recordedAudio: Record<string, RecordedAudio>;
  status: ContentStatus;
}

function buildInitialValues(activeLangs: Array<{ code: string }>): FormValues {
  const translations: Record<string, string> = {};
  const audioUrls: Record<string, string> = {};
  const recordedAudio: Record<string, RecordedAudio> = {};
  activeLangs.forEach((l) => {
    translations[l.code] = '';
    audioUrls[l.code] = '';
    recordedAudio[l.code] = null;
  });
  return {
    translations,
    categoryId: '',
    audioUrls,
    recordedAudio,
    status: 'DRAFT',
  };
}

function fromPhrase(phrase: Phrase, activeLangs: Array<{ code: string }>): FormValues {
  const base = buildInitialValues(activeLangs);
  base.translations = { ...base.translations, ...(phrase.translations ?? {}) };
  base.categoryId = phrase.categoryId?._id ?? '';
  base.status = phrase.status;

  Object.entries(phrase.audio ?? {}).forEach(([code, audio]: [string, any]) => {
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

function toInput(values: FormValues): PhraseInput {
  const translations: Record<string, string> = {};
  Object.entries(values.translations).forEach(([code, text]) => {
    const trimmed = text.trim();
    if (trimmed) translations[code] = trimmed;
  });

  const audio: PhraseInput['audio'] = {};
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
    audio: Object.keys(audio).length ? audio : undefined,
    status: values.status,
  };
}

interface PhraseFormProps {
  initial?: Phrase;
  onDone: () => void;
}

export function PhraseForm({ initial, onDone }: PhraseFormProps) {
  const { data: categories = [] } = useCategories();
  const { data: activeLanguages = [], isLoading: langsLoading } = useActiveLanguages();
  const createPhrase = useCreatePhrase();
  const updatePhrase = useUpdatePhrase();
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
    status: Yup.string().oneOf(STATUS_OPTIONS).required(),
  });

  const baseValues = initial ? fromPhrase(initial, activeLanguages) : buildInitialValues(activeLanguages);

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
            {activeLanguages.map((l) => (
              <Field
                key={l.code}
                name={`translations.${l.code}`}
                label={`${l.name} (${l.code})`}
                placeholder={l.code === 'en' ? 'e.g. How are you?' : `Translation in ${l.name}`}
              />
            ))}
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
                      hint={`Speak the phrase in ${l.name}. Max 15s. Saved directly to Cloudinary.`}
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
