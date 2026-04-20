'use client';
import { useEffect, useState } from 'react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useFirebaseStatus() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!navigator.onLine) { if (!cancelled) setConnected(false); return; }
      try {
        await getDocFromServer(doc(db, '_ping', 'status'));
        if (!cancelled) setConnected(true);
      } catch (e: any) {
        // unavailable = offline, permission-denied = online (Firebase is reachable)
        if (!cancelled) setConnected(e?.code === 'permission-denied' ? true : false);
      }
    };

    check();

    const onOnline  = () => check();
    const onOffline = () => { if (!cancelled) setConnected(false); };
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      cancelled = true;
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return connected;
}
