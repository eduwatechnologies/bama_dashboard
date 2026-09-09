'use client';

import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { useAuth } from '@/lib/auth';
import { Form, Formik } from 'formik';
import styles from '../words/page.module.css';

export default function SettingsPage() {
  const { admin, signOut } = useAuth();
  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>SETTINGS</p>
          <h1>Settings</h1>
          <p className={styles.subtitle}>
            Session, API endpoint, and account info. Tokens live in <code>localStorage</code> for the demo.
          </p>
        </div>
      </header>

      <Card title="API endpoint" description="Where the dashboard talks to the admin API.">
        <Formik
          initialValues={{
            baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1/admin',
          }}
          onSubmit={() => undefined}
        >
          <Field name="baseUrl" label="Base URL" hint="Change via NEXT_PUBLIC_API_BASE_URL at build time." />
        </Formik>
      </Card>

      <Card title="Active session" description="Tokens are stored in this browser only.">
        <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 8, columnGap: 16, fontSize: 13 }}>
          <dt style={{ color: 'var(--muted-foreground)' }}>Admin</dt>
          <dd style={{ margin: 0 }}>{admin?.name ?? '—'}</dd>
          <dt style={{ color: 'var(--muted-foreground)' }}>Email</dt>
          <dd style={{ margin: 0 }}>{admin?.email ?? '—'}</dd>
          <dt style={{ color: 'var(--muted-foreground)' }}>Role</dt>
          <dd style={{ margin: 0 }}>{admin?.role ?? '—'}</dd>
        </dl>
        <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
          <Button variant="destructive" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </Card>
    </>
  );
}
