'use client';
import { useState, useEffect } from 'react';
import CandleBG from './CandleBG';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onGoogle: () => Promise<void>;
}

export default function LoginScreen({ onLogin, onSignUp, onGoogle }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Completa todos los campos'); return; }
    setLoading(true); setError('');
    try {
      if (mode === 'login') await onLogin(email, password);
      else await onSignUp(email, password);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') setError('Credenciales incorrectas');
      else if (code === 'auth/user-not-found') setError('Usuario no encontrado');
      else if (code === 'auth/email-already-in-use') setError('Email ya registrado');
      else if (code === 'auth/weak-password') setError('Contraseña muy débil (mín. 6 caracteres)');
      else setError('Error de autenticación. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setError('');
    try {
      await onGoogle();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') setError('Popup cerrado. Intenta de nuevo.');
      else setError('Error con Google. Intenta de nuevo.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 16px',
    background: 'rgba(255,255,255,0.035)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 10, color: '#f0e8d0',
    fontSize: 14, outline: 'none', transition: 'all 0.25s',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, color: '#8a8078',
    letterSpacing: '0.10em', textTransform: 'uppercase',
    marginBottom: 8,
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CandleBG />

      <div style={{
        position: 'relative', zIndex: 10, width: 420,
        background: 'rgba(10,14,22,0.78)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: '40px 38px 36px',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
        transition: 'opacity 0.7s cubic-bezier(.22,.68,0,1.1), transform 0.7s cubic-bezier(.22,.68,0,1.1)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 18, overflow: 'hidden',
            border: '1px solid rgba(201,162,39,0.22)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 0 0 4px rgba(201,162,39,0.07)',
            marginBottom: 16, background: '#0d1018', transition: 'transform 0.4s, box-shadow 0.4s',
          }}>
            <img src="/logo.png" alt="WilTrader Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: 11, color: '#7a7060', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4 }}>
            Trading Journal Pro
          </div>
        </div>

        {/* Google button */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{
            width: '100%', padding: '12px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            background: googleLoading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
            color: '#e8e0d0', fontSize: 14, fontWeight: 600,
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.2s', marginBottom: 20,
          }}
          onMouseEnter={(e) => !googleLoading && (e.currentTarget.style.background = 'rgba(255,255,255,0.11)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = googleLoading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)')}
        >
          {googleLoading ? (
            <span style={{ width: 18, height: 18, border: '2px solid #aaa', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
          )}
          {googleLoading ? 'Conectando...' : 'Continuar con Google'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 11, color: '#5a5048', letterSpacing: '0.08em' }}>O CON EMAIL</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1, padding: '8px', border: 'none', fontSize: 12, fontWeight: 600,
                background: mode === m ? 'rgba(201,162,39,0.15)' : 'transparent',
                color: mode === m ? '#c9a227' : '#6a6050',
                cursor: 'pointer', transition: 'all 0.15s',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}
            >
              {m === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbl}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trader@example.com"
              autoComplete="email"
              style={inp}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(201,162,39,0.5)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
            />
          </div>
          <div>
            <label style={lbl}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={inp}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(201,162,39,0.5)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', fontSize: 12,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: loading ? 'rgba(201,162,39,0.4)' : 'linear-gradient(135deg,#b8880a,#d4a500,#e8c45a)',
              color: '#0a0a08', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(201,162,39,0.4)',
              transition: 'all 0.2s', marginTop: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <span style={{ width: 14, height: 14, border: '2px solid #0a0a08', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                Entrando...
              </>
            ) : (
              mode === 'login' ? 'Entrar al Journal' : 'Crear Cuenta'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: '#4a4438', letterSpacing: '0.06em' }}>
          TRADING JOURNAL WIL GÓMEZ · 2026
        </div>
      </div>
    </div>
  );
}
