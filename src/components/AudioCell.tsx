'use client';

import { PlayButton } from './PlayButton';
import { Pill } from './Pill';

export interface AudioEntry {
  code: string;
  url?: string | null;
}

interface AudioCellProps {
  /** Per-language audio entries, e.g. [{ code: 'en', url: '…' }, { code: 'ha', url: '…' }] */
  entries: AudioEntry[];
  /** Label used for the play buttons, e.g. the word/phrase text. */
  label?: string;
  /** Optional language name overrides keyed by code (e.g. { ha: 'Hausa' }). */
  languageNames?: Record<string, string>;
}

/**
 * Renders every per-language audio recording inline as a Play button.
 * No dropdown — the full per-language audio map (e.g. both `en` and `ha`
 * after migration) is always visible so it can be audited at a glance.
 */
export function AudioCell({ entries, label, languageNames = {} }: AudioCellProps) {
  const normalized = entries
    .map((e) => {
      const v = (e as any).url ?? e;
      const url = typeof v === 'string' ? v : v?.url ?? undefined;
      return { code: e.code, url };
    })
    .filter((e) => e.url);

  if (normalized.length === 0) return <Pill tone="neutral">None</Pill>;

  return (
    <div className="inline-flex items-center gap-1">
      {normalized.map((entry) => (
        <PlayButton
          key={entry.code}
          src={entry.url!}
          label={`${label ? `${label} — ` : ''}pronunciation in ${languageNames[entry.code] ?? entry.code}`}
        />
      ))}
    </div>
  );
}