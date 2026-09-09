'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import styles from './AlertDialog.module.css';

interface AlertOptions {
  title: string;
  message: string;
  variant?: 'default' | 'warning' | 'error';
  buttons?: Array<{ label: string; style?: 'default' | 'destructive' | 'primary' | 'ghost' }>;
}

interface AlertContextValue {
  show: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

interface AlertState extends AlertOptions {
  open: boolean;
  onClose: () => void;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertState | null>(null);

  const show = (options: AlertOptions) => {
    setAlert({
      ...options,
      open: true,
      onClose: () => setAlert(null),
    });
  };

  return (
    <AlertContext.Provider value={{ show }}>
      {children}
      {alert && (
        <Modal open={alert.open} onClose={alert.onClose} title={alert.title} description={alert.message} size="sm">
          <div className={styles.actions}>
            {(alert.buttons ?? [{ label: 'OK', style: 'default' }]).map((btn, idx) => (
              <Button
                key={idx}
                variant={btn.style === 'destructive' ? 'destructive' : btn.style === 'ghost' ? 'ghost' : 'primary'}
                onClick={alert.onClose}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </Modal>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within AlertProvider');
  return ctx;
}
