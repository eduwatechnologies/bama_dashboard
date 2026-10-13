'use client';

import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { useCreateLanguage, useUpdateLanguage } from '@/lib/hooks';
import { Field } from './Field';
import { Button } from './Button';
import { extractErrorMessage, extractFieldErrors } from '@/lib/api';
import type { Language } from '@/lib/types';
import styles from './ContentForm.module.css';

const schema = Yup.object({
  code: Yup.string()
    .matches(/^[a-z]{2,3}$/, 'Use a 2-3 letter lowercase ISO code.')
    .required('Required.'),
  name: Yup.string().min(2, 'Required.').required('Required.'),
  nativeName: Yup.string().min(2, 'Required.').required('Required.'),
  flag: Yup.string().max(8, 'Use a flag emoji.'),
  isRTL: Yup.boolean(),
  isActive: Yup.boolean(),
  order: Yup.number().integer().min(0),
});

interface FormValues {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isRTL: boolean;
  isActive: boolean;
  order: number;
}

const initialValues: FormValues = {
  code: '',
  name: '',
  nativeName: '',
  flag: '',
  isRTL: false,
  isActive: true,
  order: 0,
};

function fromLanguage(l: Language): FormValues {
  return {
    code: l.code,
    name: l.name,
    nativeName: l.nativeName,
    flag: l.flag ?? '',
    isRTL: l.isRTL ?? false,
    isActive: l.isActive ?? true,
    order: l.order ?? 0,
  };
}

interface LanguageFormProps {
  initial?: Language;
  onDone: () => void;
}

export function LanguageForm({ initial, onDone }: LanguageFormProps) {
  const create = useCreateLanguage();
  const update = useUpdateLanguage();
  const isEdit = Boolean(initial);
  const base = initial ? fromLanguage(initial) : initialValues;

  return (
    <Formik
      enableReinitialize
      initialValues={base}
      validationSchema={schema}
      onSubmit={async (values, helpers) => {
        const payload = {
          code: values.code.trim().toLowerCase(),
          name: values.name.trim(),
          nativeName: values.nativeName.trim(),
          flag: values.flag.trim() || undefined,
          isRTL: values.isRTL,
          isActive: values.isActive,
          order: values.order,
        };
        try {
          if (initial) {
            await update.mutateAsync({ code: initial.code, input: payload });
          } else {
            await create.mutateAsync(payload);
          }
          onDone();
        } catch (err) {
          const fields = extractFieldErrors(err);
          if (fields) fields.forEach((f) => helpers.setFieldError(f.field, f.message));
          helpers.setStatus({ form: extractErrorMessage(err, 'Could not save the language.') });
        } finally {
          helpers.setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, status, values, setFieldValue }) => (
        <Form className={styles.form}>
          <div className={styles.grid}>
            <Field name="code" label="Code" placeholder="en" hint="2-3 letter ISO code, e.g. ha, yo, ig." disabled={isEdit} />
            <Field name="name" label="Name" placeholder="English" hint="Display name in English." />
            <Field name="nativeName" label="Native name" placeholder="English" hint="Endonym, e.g. Hausa, Yorùbá." />
            <Field name="flag" label="Flag" placeholder="🇬🇧" hint="Optional emoji." />
          </div>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Order</span>
              <Field
                as="input"
                type="number"
                name="order"
                label=""
                value={values.order}
                onChange={(e) => setFieldValue('order', Number(e.target.value))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Status</span>
              <Field as="select" name="isActive" label="">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Field>
            </label>
          </div>
          <label className={styles.field}>
            <span className={styles.label}>Direction</span>
            <Field as="select" name="isRTL" label="">
              <option value="false">Left-to-right</option>
              <option value="true">Right-to-left</option>
            </Field>
          </label>
          {status?.form && <p className={styles.alert}>{status.form}</p>}
          <div className={styles.actions}>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Add language'}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
