'use client';

import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { extractErrorMessage } from '@/lib/api';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  trigger?: (open: () => void) => ReactNode;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<unknown> | unknown;
}

export function ConfirmDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err, 'Action failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {trigger && trigger(() => setOpen(true))}
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description} size="sm">
        {error && <p className={styles.alert}>{error}</p>}
        <div className={styles.actions}>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            onClick={() => void handleConfirm()}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
