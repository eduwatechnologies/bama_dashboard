'use client';

import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { useUpdateAppUpdate } from '@/lib/hooks';
import { Field } from './Field';
import { Button } from './Button';
import { extractErrorMessage, extractFieldErrors } from '@/lib/api';
import type { AppUpdateSettings } from '@/lib/types';
import styles from './ContentForm.module.css';

const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

const schema = Yup.object({
  enabled: Yup.boolean(),
  latestVersion: Yup.string()
    .trim()
    .matches(VERSION_REGEX, 'Use semantic versioning, e.g. 1.2.0.')
    .required('Required.'),
  minVersion: Yup.string()
    .trim()
    .matches(VERSION_REGEX, 'Use semantic versioning, e.g. 1.0.0.')
    .required('Required.'),
  storeUrl: Yup.string()
    .trim()
    .max(500, 'Too long.')
    .test('url', 'Enter a valid URL.', (value) => !value || /^https?:\/\/\S+$/i.test(value)),
  message: Yup.string().trim().max(300, 'Keep it under 300 characters.'),
});

interface FormValues {
  enabled: boolean | string;
  latestVersion: string;
  minVersion: string;
  storeUrl: string;
  message: string;
}

function fromSettings(settings: AppUpdateSettings): FormValues {
  return {
    enabled: settings.enabled,
    latestVersion: settings.latestVersion,
    minVersion: settings.minVersion,
    storeUrl: settings.storeUrl ?? '',
    message: settings.message ?? '',
  };
}

interface AppUpdateFormProps {
  settings: AppUpdateSettings;
  disabled?: boolean;
}

export function AppUpdateForm({ settings, disabled }: AppUpdateFormProps) {
  const update = useUpdateAppUpdate();

  return (
    <Formik
      enableReinitialize
      initialValues={fromSettings(settings)}
      validationSchema={schema}
      onSubmit={async (values, helpers) => {
        const payload: AppUpdateSettings = {
          enabled: values.enabled === true || String(values.enabled) === 'true',
          latestVersion: values.latestVersion.trim(),
          minVersion: values.minVersion.trim(),
          storeUrl: values.storeUrl.trim(),
          message: values.message.trim(),
        };
        try {
          await update.mutateAsync(payload);
          helpers.setStatus({ success: 'Saved. The app picks this up on its next launch.' });
        } catch (err) {
          const fields = extractFieldErrors(err);
          if (fields) fields.forEach((f) => helpers.setFieldError(f.field, f.message));
          helpers.setStatus({ form: extractErrorMessage(err, 'Could not save the update settings.') });
        } finally {
          helpers.setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, status }) => (
        <Form className={styles.form}>
          <div className={styles.grid}>
            <Field
              as="select"
              name="enabled"
              label="Update gate"
              hint="When disabled, the app never prompts for an update."
              disabled={disabled}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </Field>
            <Field
              name="storeUrl"
              label="Store URL"
              placeholder="https://play.google.com/store/apps/details?id=…"
              hint="Where the update button sends users."
              disabled={disabled}
            />
          </div>
          <div className={styles.grid}>
            <Field
              name="latestVersion"
              label="Latest version"
              placeholder="1.2.0"
              hint="Installed versions below this get a dismissible prompt."
              disabled={disabled}
            />
            <Field
              name="minVersion"
              label="Minimum version"
              placeholder="1.0.0"
              hint="Installed versions below this are blocked until updated."
              disabled={disabled}
            />
          </div>
          <Field
            as="textarea"
            name="message"
            label="Prompt message"
            placeholder="Optional note shown in the update prompt."
            hint="Optional. Leave blank to use the default copy."
            disabled={disabled}
          />
          {status?.form && <p className={styles.alert}>{status.form}</p>}
          {status?.success && <p className={styles.success}>{status.success}</p>}
          {!disabled && (
            <div className={styles.actions}>
              <Button type="submit" loading={isSubmitting}>
                Save update settings
              </Button>
            </div>
          )}
        </Form>
      )}
    </Formik>
  );
}
