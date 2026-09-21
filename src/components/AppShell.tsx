'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import styles from './AppShell.module.css';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const nav: NavItem[] = [
  { href: '/', label: 'Overview', icon: '◐' },
  { href: '/words', label: 'Words', icon: 'A' },
  { href: '/phrases', label: 'Phrases', icon: '✎' },
  { href: '/categories', label: 'Categories', icon: '☰' },
  { href: '/ads', label: 'Ads', icon: '◫' },
  { href: '/contributions', label: 'Review queue', icon: '✓' },
  { href: '/installations', label: 'Installations', icon: '◯' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

const MOBILE_BREAKPOINT = 900;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { admin, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const initials =
    admin?.name
      ?.split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? 'A';

  // Auto-close drawer on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open on mobile.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (open) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={styles.shell} data-sidebar-open={open || undefined}>
      <button
        type="button"
        className={styles.menuButton}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="primary-sidebar"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.menuIcon} aria-hidden>
          {open ? '×' : '☰'}
        </span>
      </button>

      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <aside
        id="primary-sidebar"
        className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}
        aria-label="Primary"
      >
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden>B</div>
          <div>
            <div className={styles.brandName}>Bama</div>
            <div className={styles.brandTag}>Admin console</div>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Primary">
          {nav.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.navIcon} aria-hidden>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFoot}>
          <div className={styles.statusDot} aria-hidden />
          <span>API · {process.env.NEXT_PUBLIC_API_BASE_URL ?? 'localhost'}</span>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.search}>
            <span aria-hidden>⌕</span>
            <input type="search" placeholder="Search words, phrases, or contributions…" />
          </div>
          <div className={styles.topActions}>
            <div className={styles.user}>
              <div className={styles.avatar}>{initials}</div>
              <div className={styles.userMeta}>
                <span className={styles.userName}>{admin?.name ?? 'Admin'}</span>
                <span className={styles.userRole}>{admin?.role ?? '—'}</span>
              </div>
            </div>
            <button className={styles.signOut} onClick={() => void signOut()} type="button">
              Sign out
            </button>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>

      {/* marker for tests / media-query hooks */}
      <span hidden data-mobile-breakpoint={MOBILE_BREAKPOINT} />
    </div>
  );
}
