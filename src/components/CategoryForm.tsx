'use client';

import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { useCategories, useCreateCategory, useUpdateCategory } from '@/lib/hooks';
import { Field } from './Field';
import { Button } from './Button';
import { extractErrorMessage, extractFieldErrors } from '@/lib/api';
import type { Category, CategoryStatus } from '@/lib/types';
import styles from './ContentForm.module.css';

const STATUS_OPTIONS: CategoryStatus[] = ['ACTIVE', 'INACTIVE'];

const schema = Yup.object({
  name: Yup.string().min(2, 'Required.').required('Required.'),
  slug: Yup.string()
    .matches(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only.')
    .required('Required.'),
  description: Yup.string().max(200),
  icon: Yup.string().max(40),
  status: Yup.string().oneOf(STATUS_OPTIONS).required(),
});

interface FormValues {
  name: string;
  slug: string;
  description: string;
  icon: string;
  status: CategoryStatus;
}

const initialValues: FormValues = {
  name: '',
  slug: '',
  description: '',
  icon: '',
  status: 'ACTIVE',
};

function fromCategory(c: Category): FormValues {
  return {
    name: c.name,
    slug: c.slug,
    description: c.description ?? '',
    icon: c.icon ?? '',
    status: c.status,
  };
}

interface CategoryFormProps {
  initial?: Category;
  onDone: () => void;
}

export function CategoryForm({ initial, onDone }: CategoryFormProps) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const isEdit = Boolean(initial);
  const base = initial ? fromCategory(initial) : initialValues;

  return (
    <Formik
      enableReinitialize
      initialValues={base}
      validationSchema={schema}
      onSubmit={async (values, helpers) => {
        const payload = {
          name: values.name.trim(),
          slug: values.slug.trim(),
          description: values.description.trim() || undefined,
          icon: values.icon.trim() || undefined,
          status: values.status,
        };
        try {
          if (initial) {
            await update.mutateAsync({ id: initial._id, input: payload });
          } else {
            await create.mutateAsync(payload);
          }
          onDone();
        } catch (err) {
          const fields = extractFieldErrors(err);
          if (fields) fields.forEach((f) => helpers.setFieldError(f.field, f.message));
          helpers.setStatus({ form: extractErrorMessage(err, 'Could not save the category.') });
        } finally {
          helpers.setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, status, values, setFieldValue }) => (
        <Form className={styles.form}>
          <div className={styles.grid}>
            <Field
              name="name"
              label="Name"
              placeholder="Greetings"
              onChange={(e) => {
                setFieldValue('name', e.target.value);
                if (!initial) {
                  setFieldValue(
                    'slug',
                    e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                  );
                }
              }}
              value={values.name}
            />
            <Field name="slug" label="Slug" placeholder="greetings" hint="Used in URLs and the public API." />
          </div>
          <Field as="textarea" name="description" label="Description" placeholder="What is this category for?" />
          <div className={styles.grid}>
            <Field name="icon" label="Icon key" placeholder="wave" hint="Matches your design system." />
            <label className={styles.field}>
              <span className={styles.label}>Status</span>
              <Field as="select" name="status" label="">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Field>
            </label>
          </div>
          {status?.form && <p className={styles.alert}>{status.form}</p>}
          <div className={styles.actions}>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create category'}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
