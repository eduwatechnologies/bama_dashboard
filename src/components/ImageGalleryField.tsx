'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAlert } from '@/components/AlertDialog';
import { uploadImage } from '@/lib/api';
import { Button } from './Button';
import styles from './ImageGalleryField.module.css';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_IMAGES = 10;

interface ImageGalleryFieldProps {
  value?: string[];
  onChange: (next: string[]) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

export function ImageGalleryField({
  value = [],
  onChange,
  label = 'Creatives',
  hint,
  disabled = false,
}: ImageGalleryFieldProps) {
  const { show } = useAlert();
  const [uploading, setUploading] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const valueRef = useRef<string[]>(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const send = useCallback(
    async (files: File[]) => {
      const room = MAX_IMAGES - valueRef.current.length;
      if (room <= 0) {
        show({
          title: 'Carousel is full',
          message: `A personal ad can carry up to ${MAX_IMAGES} images.`,
          variant: 'warning',
          buttons: [{ label: 'Got it', style: 'default' }],
        });
        return;
      }

      const accepted: File[] = [];
      let rejected = 0;
      for (const file of files.slice(0, room)) {
        if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
          rejected += 1;
          continue;
        }
        accepted.push(file);
      }

      if (rejected > 0) {
        show({
          title: `${rejected} file${rejected > 1 ? 's' : ''} skipped`,
          message: 'Use JPEG, PNG, WebP, GIF, or AVIF under 3 MB.',
          variant: 'warning',
          buttons: [{ label: 'Got it', style: 'default' }],
        });
      }
      if (accepted.length === 0) return;

      setUploading(accepted.length);
      setFailedCount(0);
      const uploaded: string[] = [];

      for (const file of accepted) {
        const form = new FormData();
        form.append('image', file, file.name);
        try {
          const result = await uploadImage(form);
          uploaded.push(result.url);
          onChange([...valueRef.current, ...uploaded]);
        } catch {
          setFailedCount((count) => count + 1);
        } finally {
          setUploading((count) => Math.max(0, count - 1));
        }
      }
    },
    [onChange, show],
  );

  const remove = useCallback(
    (url: string) => {
      onChange(valueRef.current.filter((item) => item !== url));
    },
    [onChange],
  );

  const move = useCallback(
    (index: number, delta: number) => {
      const next = [...valueRef.current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      onChange(next);
    },
    [onChange],
  );

  const busy = disabled || uploading > 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.count}>
          {value.length}/{MAX_IMAGES}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        className={styles.input}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          if (files.length) void send(files);
        }}
        disabled={disabled}
      />

      <div className={styles.actions}>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={busy || value.length >= MAX_IMAGES}
        >
          {value.length ? 'Add images' : 'Upload images'}
        </Button>
        {uploading > 0 && (
          <span className={styles.status}>Uploading {uploading}…</span>
        )}
        {!uploading && failedCount > 0 && (
          <span className={styles.error}>{failedCount} upload(s) failed</span>
        )}
      </div>

      {value.length > 0 && (
        <ul className={styles.grid}>
          {value.map((url, index) => (
            <li key={url} className={styles.item}>
              <img className={styles.thumb} src={url} alt="" />
              <div className={styles.itemActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || busy}
                  aria-label={`Move image ${index + 1} earlier`}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1 || busy}
                  aria-label={`Move image ${index + 1} later`}
                >
                  ›
                </button>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => remove(url)}
                  disabled={busy}
                  aria-label={`Remove image ${index + 1}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
