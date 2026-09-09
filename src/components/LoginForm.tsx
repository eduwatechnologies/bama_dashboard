'use client';

import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Field } from './Field';
import { Button } from './Button';
import { loginRequest, useAuth } from '@/lib/auth';
import { extractErrorCode, extractErrorMessage, extractFieldErrors } from '@/lib/api';
import styles from './LoginForm.module.css';

const schema = Yup.object({
  email: Yup.string().email('Enter a valid email.').required('Email is required.'),
  password: Yup.string().min(6, 'At least 6 characters.').required('Password is required.'),
});

export function LoginForm() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace('/');
    }
  }, [isReady, isAuthenticated, router]);

  return (
    <Formik
      initialValues={{ email: '', password: '' }}
      validationSchema={schema}
      onSubmit={async (values, helpers) => {
        try {
          await loginRequest(values.email.trim().toLowerCase(), values.password);
          router.replace('/');
        } catch (err) {
          const code = extractErrorCode(err);
          const fields = extractFieldErrors(err);
          if (code === 'AUTHENTICATION_ERROR' || code === 'RATE_LIMIT_ERROR') {
            helpers.setStatus({ form: extractErrorMessage(err, 'Sign-in failed.') });
            return;
          }
          if (fields && fields.length > 0) {
            fields.forEach((f) => helpers.setFieldError(f.field, f.message));
            return;
          }
          helpers.setStatus({ form: extractErrorMessage(err, 'Sign-in failed.') });
        } finally {
          helpers.setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, status }) => (
        <Form className={styles.card}>
          <header className={styles.header}>
            <h2>Sign in</h2>
            <p>Use your admin credentials to access the console.</p>
          </header>
          <Field name="email" type="email" label="Email" autoComplete="username" placeholder="admin@hausabridge.app" />
          <Field name="password" type="password" label="Password" autoComplete="current-password" placeholder="••••••••" />
          {status?.form && <p className={styles.alert}>{status.form}</p>}
          <Button type="submit" loading={isSubmitting}>Sign in</Button>
        </Form>
      )}
    </Formik>
  );
}
