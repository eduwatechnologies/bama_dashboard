import type { Metadata } from 'next';
import styles from './page.module.css';
import { Button } from '@/components/Button';

export const metadata: Metadata = {
  title: 'Bama — Learn Hausa with confidence',
  description:
    'Bama is a Hausa ↔ English phrasebook with native audio, daily practice, and community-driven corrections. Available on Android, iOS, and the web.',
};

const features = [
  {
    icon: '◯',
    title: 'Native-speaker audio',
    body: 'Every phrase is recorded by a Hausa-speaking voice so pronunciation stops being guesswork.',
  },
  {
    icon: '◐',
    title: 'Daily practice',
    body: 'A handful of new phrases each day, spaced repetition baked in, and a streak you can actually keep.',
  },
  {
    icon: '✎',
    title: 'Record yourself',
    body: 'Compare your pronunciation to the native clip side-by-side and save your takes per phrase.',
  },
  {
    icon: '⇄',
    title: 'Two-way translation',
    body: 'Switch between English → Hausa and Hausa → English, with full offline support after the first sync.',
  },
  {
    icon: '☰',
    title: 'Curated categories',
    body: 'Greetings, travel, family, food, market, and more — organised for the moments you actually need them.',
  },
  {
    icon: '✓',
    title: 'Community-reviewed',
    body: 'Submissions go through a Hausa-speaker review queue so the phrasebook keeps getting more accurate over time.',
  },
];

const steps = [
  { num: '01', title: 'Download Bama', body: 'Grab the app on Android or iOS. The web build is here too for desk work.' },
  { num: '02', title: 'Pick a direction', body: 'Choose English → Hausa or Hausa → English. You can flip any time from the home tab.' },
  { num: '03', title: 'Practice daily', body: 'Five minutes a day is enough — listen, repeat, and save the phrases you actually use.' },
];

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <a className={styles.brand} href="#top" aria-label="Bama home">
          <span className={styles.brandMark} aria-hidden>B</span>
          <span className={styles.brandName}>Bama</span>
        </a>
        <nav className={styles.navLinks} aria-label="Sections">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#download">Download</a>
        </nav>
        <a className={styles.adminLink} href="/">
          Admin console →
        </a>
      </header>

      <section id="top" className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>HAUSA · ENGLISH</p>
          <h1 className={styles.heroTitle}>
            Learn the language that <span className={styles.accent}>opens West Africa</span>.
          </h1>
          <p className={styles.heroSubtitle}>
            Bama is a Hausa ↔ English phrasebook built around short, useful phrases you can actually pronounce. Native-speaker audio, daily
            practice, and offline support — all in your pocket.
          </p>
          <div className={styles.heroActions}>
            <a href="#download" className={styles.ctaPrimary}>
              Download Bama
            </a>
            <a href="#features" className={styles.ctaSecondary}>
              See what&apos;s inside
            </a>
          </div>
          <ul className={styles.heroFacts}>
            <li>
              <strong>1,200+</strong>
              <span>curated phrases</span>
            </li>
            <li>
              <strong>Offline</strong>
              <span>after first sync</span>
            </li>
            <li>
              <strong>Free</strong>
              <span>no ads, no tracking</span>
            </li>
          </ul>
        </div>
        <div className={styles.heroVisual} aria-hidden>
          <div className={styles.phone}>
            <div className={styles.phoneNotch} />
            <div className={styles.phoneScreen}>
              <div className={styles.screenEyebrow}>TODAY · DAY 14</div>
              <p className={styles.screenHausa}>Ina kwana</p>
              <p className={styles.screenEnglish}>Good morning</p>
              <div className={styles.screenRow}>
                <span className={styles.screenPill}>Greetings</span>
                <span className={styles.screenPill}>★ Saved</span>
              </div>
              <div className={styles.screenProgress}>
                <span style={{ width: '62%' }} />
              </div>
              <p className={styles.screenTip}>Tap to hear · record yourself to compare</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className={styles.section}>
        <header className={styles.sectionHeader}>
          <p className={styles.eyebrow}>FEATURES</p>
          <h2>Built for real conversations, not flashcards</h2>
          <p className={styles.sectionSubtitle}>
            Everything you need to go from &quot;what&apos;s the word for…&quot; to actually saying it out loud.
          </p>
        </header>
        <div className={styles.featureGrid}>
          {features.map((f) => (
            <article key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon} aria-hidden>
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className={styles.section}>
        <header className={styles.sectionHeader}>
          <p className={styles.eyebrow}>HOW IT WORKS</p>
          <h2>Up and running in under a minute</h2>
        </header>
        <ol className={styles.steps}>
          {steps.map((step) => (
            <li key={step.num} className={styles.step}>
              <span className={styles.stepNum}>{step.num}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="download" className={styles.download}>
        <div className={styles.downloadCopy}>
          <p className={styles.eyebrow}>DOWNLOAD</p>
          <h2>Take Bama with you</h2>
          <p>
            Available on Android today. iOS is on the way — drop your email and we&apos;ll let you know the moment it ships.
          </p>
        </div>
        <div className={styles.storeRow}>
          <a
            className={`${styles.storeButton} ${styles.storeButtonActive}`}
            href="https://play.google.com/store/apps/details?id=app.hausabridge.bama"
            target="_blank"
            rel="noreferrer"
            aria-label="Get Bama on Google Play"
          >
            <span className={styles.storeBadge}>GET IT ON</span>
            <span className={styles.storeName}>Google Play</span>
            <span className={styles.storeHint}>Android · v1.0</span>
          </a>
          <div
            className={`${styles.storeButton} ${styles.storeButtonDisabled}`}
            aria-label="Bama on the App Store — coming soon"
          >
            <span className={styles.storeBadge}>COMING SOON</span>
            <span className={styles.storeName}>App Store</span>
            <span className={styles.storeHint}>iOS · notify me when it ships</span>
          </div>
        </div>
        <form
          className={styles.notify}
          action="mailto:hello@hausabridge.app"
          method="post"
          encType="text/plain"
        >
          <label htmlFor="notify-email" className={styles.notifyLabel}>
            Want a heads-up when iOS launches?
          </label>
          <div className={styles.notifyRow}>
            <input
              id="notify-email"
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              className={styles.notifyInput}
            />
            <Button type="submit" size="md">
              Notify me
            </Button>
          </div>
        </form>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden>B</span>
            <span className={styles.brandName}>Bama</span>
          </div>
          <p>© {new Date().getFullYear()} HausaBridge. Built for the people who use the language every day.</p>
          <div className={styles.footerLinks}>
            <a href="/">Admin</a>
            <a href="mailto:hello@hausabridge.app">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
