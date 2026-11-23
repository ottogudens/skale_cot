'use client';

import { useEffect } from 'react';

/** Registers the installation capability without caching app data or responses. */
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }, []);
  return null;
}
