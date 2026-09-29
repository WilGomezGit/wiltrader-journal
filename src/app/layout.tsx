import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'WilTrader — Trading Journal Pro',
  description: 'Professional Trading Journal by Wil Gómez',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ height: '100vh', overflow: 'hidden', margin: 0 }}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#18181b',
              color: '#f0e8d0',
              border: '1px solid #333340',
              fontSize: 13,
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#18181b' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#18181b' } },
          }}
        />
      </body>
    </html>
  );
}
