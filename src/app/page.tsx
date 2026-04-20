'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppProvider, useApp } from '@/context/AppContext';
import LoginScreen from '@/components/auth/LoginScreen';

function RootRedirect() {
  const { user, loading, signIn, signUp, signInWithGoogle } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border2)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (user) return null;

  return (
    <LoginScreen
      onLogin={async (email, password) => {
        await signIn(email, password);
        router.replace('/dashboard');
      }}
      onSignUp={async (email, password) => {
        await signUp(email, password);
        router.replace('/dashboard');
      }}
      onGoogle={async () => {
        await signInWithGoogle();
        router.replace('/dashboard');
      }}
    />
  );
}

export default function Home() {
  return (
    <AppProvider>
      <RootRedirect />
    </AppProvider>
  );
}
