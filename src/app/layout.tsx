import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WilTrader — Trading Journal Pro',
  description: 'Professional Trading Journal by Wil Gómez',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ height: '100vh', overflow: 'hidden', margin: 0 }}>{children}</body>
    </html>
  );
}
