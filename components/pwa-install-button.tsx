'use client';

import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

export function PwaInstallButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPromptEvent); };
    const clear = () => setPrompt(null);
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', clear);
    return () => { window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('appinstalled', clear); };
  }, []);
  if (!prompt) return null;
  return <button className="pwa-install" onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }}>↓ Instalar</button>;
}
