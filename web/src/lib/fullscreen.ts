/** Tela cheia "como app": Fullscreen API + detecção de PWA instalado. */
export const isStandalone = () =>
  window.matchMedia('(display-mode: fullscreen)').matches ||
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

export const isFullscreen = () => !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;

export const canFullscreen = () => !!(document.documentElement.requestFullscreen || (document.documentElement as any).webkitRequestFullscreen);

export async function enterFullscreen() {
  if (isStandalone() || isFullscreen()) return true;
  const el = document.documentElement as any;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    try {
      await (screen.orientation as any)?.lock?.('any');
    } catch {
      /* nem todo navegador permite */
    }
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen() {
  const d = document as any;
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else d.webkitExitFullscreen?.();
  } catch {
    /* ignore */
  }
}

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Evento de instalação do PWA (Android/Chrome/Edge). */
let installEvent: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
});
export const canInstall = () => !!installEvent;
export async function promptInstall() {
  if (!installEvent) return false;
  installEvent.prompt();
  const r = await installEvent.userChoice.catch(() => null);
  installEvent = null;
  return r?.outcome === 'accepted';
}
