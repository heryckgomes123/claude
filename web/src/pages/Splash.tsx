/**
 * SPLASH — a entrada cinematográfica.
 * Escuridão → o medalhão do Javali acende → MIÚDA® → DA TOCA DO JAVALI →
 * [ENTRAR NA TOCA]. Ao entrar: tela cheia, som de porta e mergulho na Toca.
 */
import { useEffect, useState } from 'react';
import { Medallion } from '../brand/Logo';
import { Embers } from '../scene/TavernScene';
import { Button } from '../components/ui';
import { enterFullscreen, isStandalone } from '../lib/fullscreen';
import { getPrefs } from '../lib/prefs';
import { setAmbience, sfx, unlockAudio } from '../lib/sound';

export function Splash({ onEnter }: { onEnter: () => void }) {
  const [phase, setPhase] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const ts = [setTimeout(() => setPhase(1), 350), setTimeout(() => setPhase(2), 1500), setTimeout(() => setPhase(3), 2400), setTimeout(() => setPhase(4), 3100)];
    return () => ts.forEach(clearTimeout);
  }, []);

  const enter = async () => {
    if (leaving) return;
    unlockAudio();
    sfx.door();
    if (getPrefs().autoFullscreen) enterFullscreen();
    if (getPrefs().ambience) setAmbience(true);
    setLeaving(true);
    setTimeout(onEnter, 900);
  };

  return (
    <div className={`splash phase-${phase} ${leaving ? 'is-leaving' : ''}`} onClick={() => phase < 4 && setPhase(4)} role="presentation">
      <div className="splash-glow" />
      {phase >= 1 && <Embers density={0.8} />}
      <div className="splash-center">
        <div className="splash-medal">
          <Medallion size={200} />
        </div>
        <h1 className="splash-word t-display" aria-label="MIÚDA">
          {'MIÚDA'.split('').map((ch, i) => (
            <span key={i} style={{ animationDelay: `${i * 90}ms` }}>
              {ch}
            </span>
          ))}
          <sup>®</sup>
        </h1>
        <div className="splash-sub">
          <span className="line" />
          <span>Da Toca do Javali</span>
          <span className="line" />
        </div>
        <div className="splash-cta">
          <Button variant="primary" size="xl" pulse onClick={(e) => (e.stopPropagation(), enter())} autoFocus>
            Entrar na Toca
          </Button>
          <p className="t-xs t-dim">{isStandalone() ? 'Bem-vindo de volta, viajante.' : 'Toque para entrar em tela cheia · Instale para jogar como app'}</p>
        </div>
      </div>
      <div className="splash-flash" />
    </div>
  );
}
