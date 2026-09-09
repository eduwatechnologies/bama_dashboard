'use client';

import { useField } from 'formik';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

type CommonProps = {
  name: string;
  label: string;
  hint?: string;
  leadingIcon?: ReactNode;
};

type AsInput = CommonProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> & { as?: 'input' };
type AsSelect = CommonProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'> & { as: 'select'; children: ReactNode };
type AsTextarea = CommonProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> & { as: 'textarea' };

type FieldProps = AsInput | AsSelect | AsTextarea;

export function Field(props: FieldProps) {
  const [field, meta] = useField(props.name);
  const error = meta.touched && meta.error ? meta.error : undefined;
  const { name, label, hint, leadingIcon, as = 'input', ...rest } = props as FieldProps & { as?: 'input' | 'select' | 'textarea' };

  const control =
    as === 'select' ? (
      <select
        {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
        {...field}
        value={field.value ?? ''}
        aria-invalid={Boolean(error)}
        className={styles.control}
      >
        {(rest as AsSelect).children}
      </select>
    ) : as === 'textarea' ? (
      <textarea
        {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        {...field}
        value={field.value ?? ''}
        aria-invalid={Boolean(error)}
        className={styles.control}
        rows={4}
      />
    ) : (
      <input
        {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        {...field}
        value={field.value ?? ''}
        aria-invalid={Boolean(error)}
        className={styles.control}
      />
    );

  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.inputWrap} ${error ? styles.inputWrapError : ''} ${as === 'textarea' ? styles.textareaWrap : ''}`}>
        {leadingIcon && <span className={styles.leadingIcon}>{leadingIcon}</span>}
        {control}
      </span>
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </label>
  );
}
