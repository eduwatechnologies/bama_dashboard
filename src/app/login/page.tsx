import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import styles from './page.module.css';

export const metadata = { title: 'Sign in · Bama Dashboard' };

export default function LoginPage() {
  // If a session already exists the client AuthGate will redirect away,
  // but this also covers the no-JS path.
  return (
    <div className={styles.wrap}>
      <div className={styles.brand}>
        <div className={styles.mark}>B</div>
        <div>
          <div className={styles.brandName}>Bama</div>
          <div className={styles.brandTag}>Admin console</div>
        </div>
      </div>
      <LoginForm />
      <p className={styles.foot}>
        Need help? See <code>dashboard/admin.md</code> for the API contract.
      </p>
    </div>
  );
}
