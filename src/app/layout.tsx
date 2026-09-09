import type { Metadata } from 'next';
import { ReactQueryProvider } from './providers';
import { AuthGate } from '@/lib/auth';
import { AlertProvider } from '@/components/AlertDialog';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bama Dashboard',
  description: 'Admin dashboard for the Bama language bridge.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>
          <AlertProvider>
            <AuthGate>{children}</AuthGate>
          </AlertProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
