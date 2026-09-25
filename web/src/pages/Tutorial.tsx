/**
 * Onboarding visual — Aldren, o Sábio, apresenta a Toca em 9 capítulos.
 */
import { useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Shield, Table2 } from 'lucide-react';
import { patch } from '../lib/api';
import { useMe, useSession } from '../lib/session';
import { Medallion } from '../brand/Logo';
import { CharacterArt } from '../components/Portrait';
import { Button, Emblem, Lives, Miudas, Panel, Progress } from '../components/ui';
import { DiamondGem, MiudaCoin, PointsSeal } from '../components/Icon';
import { Die } from './Game';
import { sfx } from '../lib/sound';

interface Step {
  title: string;
  art: ReactNode;
  text: ReactNode;
}

const STEPS: Step[] = [
  {
    title: 'Bem-vindo à Toca do Javali',
    art: <Medallion size={170} />,
    text: (
      <>
        A Toca é a maior taverna do reino. Aqui se joga, se aposta e se faz fama. Mesas acesas a noite toda, clubes com seus estandartes e o velho javali de bronze vigiando tudo sobre a lareira.
      </>
    ),
  },
  {
    title: 'As Miúdas',
    art: (
      <div className="tut-coins">
        <MiudaCoin size={90} />
        <MiudaCoin size={64} />
        <MiudaCoin size={48} />
      </div>
    ),
    text: (
      <>
        <b>Miúdas</b> são a moeda da Toca (referência: 1 Miúda = R$ 1). Você paga a entrada das mesas com elas e recebe o prêmio quando vence. Tudo fica registrado no seu <b>extrato</b>, e você pode transferir Miúdas para outros jogadores.
      </>
    ),
  },
  {
    title: 'Como jogar os Dados do Javali',
    art: (
      <div className="tut-dice">
        {[1, 5, 5, 3, 3, 3].map((v, i) => (
          <Die key={i} value={v} size={48} selected={i === 0 || i >= 3} />
        ))}
      </div>
    ),
    text: (
      <>
        Role os 6 dados e separe o que pontua: <b>1 vale 100</b>, <b>5 vale 50</b>, trincas valem face × 100 (três 1 valem 1.000). Depois escolha: <b>arriscar</b> os dados restantes ou <b>guardar</b> os pontos do turno. Se a rolagem não pontuar nada… <b className="t-danger">JAVALI!</b> Você perde o turno.
      </>
    ),
  },
  {
    title: 'Entrando nas mesas',
    art: (
      <div className="tut-table">
        <Table2 size={70} />
        <span className="seat-dot is-taken" />
        <span className="seat-dot is-taken" />
        <span className="seat-dot" />
      </div>
    ),
    text: (
      <>
        Em <b>Jogar</b> você encontra as mesas: cada uma mostra jogadores, entrada e prêmio. Ao sentar, uma contagem começa; lugares vazios podem ser ocupados por bots da casa. Também dá para criar uma <b>Sala Privada</b> e chamar amigos com um código.
      </>
    ),
  },
  {
    title: 'Clubes',
    art: (
      <div className="row gap-4">
        <Emblem icon="boar" color="bronze" size={80} />
        <Emblem icon="raven" color="noite" size={64} />
        <Emblem icon="anvil" color="brasa" size={64} />
      </div>
    ),
    text: (
      <>
        Clubes são irmandades com mesas exclusivas, caixa próprio, administradores e agentes. Entre em um clube aberto, peça entrada ou funde o seu próprio estandarte.
      </>
    ),
  },
  {
    title: 'Vidas',
    art: <Lives lives={2} size={56} />,
    text: (
      <>
        Você tem <b>3 vidas</b> para os treinos contra bots. Cada derrota custa 1 vida; elas voltam sozinhas com o tempo, ou você pode recarregá-las com diamantes. Sem vidas, os treinos ficam bloqueados — mas as mesas continuam abertas.
      </>
    ),
  },
  {
    title: 'Pontos e reputação',
    art: <PointsSeal size={110} />,
    text: (
      <>
        Toda partida rende <b>pontos</b> — mais ainda nas vitórias. Pontos são sua reputação: definem seu <b>nível</b>, seu lugar no <b>ranking</b> e desbloqueiam títulos e personagens.
      </>
    ),
  },
  {
    title: 'Diamantes',
    art: <DiamondGem size={110} />,
    text: (
      <>
        <b>Diamantes</b> são raros: vêm de conquistas, subidas de nível e da sorte nas mesas. Use-os no <b>Relicário</b> para desbloquear personagens, molduras e recarregar vidas.
      </>
    ),
  },
  {
    title: 'Sua lenda começa agora',
    art: (
      <div className="tut-chars">
        {['borg', 'kael', 'lynx', 'aldren'].map((c) => (
          <div key={c} className="tut-char">
            <CharacterArt id={c} />
          </div>
        ))}
      </div>
    ),
    text: (
      <>
        Jogue, vença, suba de nível, conquiste feitos e grave seu nome na Parede da Fama. Seus primeiros <Miudas value={1000} size={16} /> já estão na bolsa. A lareira está acesa — boa sorte, viajante!
      </>
    ),
  },
];

export default function Tutorial() {
  const me = useMe();
  const { setMe } = useSession();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const first = params.get('primeiro') === '1' || !me.tutorialDone;
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const step = STEPS[i];
  const finish = async () => {
    setBusy(true);
    try {
      if (!me.tutorialDone) setMe(await patch('/me', { tutorialDone: true }));
      sfx.win();
      nav('/');
    } finally {
      setBusy(false);
    }
  };
  const go = (d: number) => {
    sfx.click();
    setI((x) => Math.max(0, Math.min(STEPS.length - 1, x + d)));
  };
  return (
    <div className="page tutorial">
      <div className="row row-between">
        <span className="t-xs t-up t-dim">
          Capítulo {i + 1} de {STEPS.length}
        </span>
        {first && (
          <button className="t-xs t-up" style={{ color: 'var(--c-text-3)' }} onClick={finish}>
            Pular tutorial
          </button>
        )}
      </div>
      <Progress value={(i + 1) / STEPS.length} gold />
      <Panel variant="parchment" rivets className="tut-card" key={i}>
        <div className="tut-art">{step.art}</div>
        <h1 className="tut-title">{step.title}</h1>
        <p className="tut-text">{step.text}</p>
        <div className="tut-guide">
          <div className="tut-guide-art">
            <CharacterArt id="aldren" />
          </div>
          <span className="t-small">
            <b>Aldren, o Sábio</b> — {i === 0 ? '“Sente-se, viajante. Vou lhe mostrar como as coisas funcionam por aqui.”' : i === STEPS.length - 1 ? '“Agora vá. E não deixe o javali pegar você.”' : '“Preste atenção — isso vale Miúdas.”'}
          </span>
        </div>
      </Panel>
      <div className="tut-dots">
        {STEPS.map((_, k) => (
          <button key={k} className={k === i ? 'is-on' : ''} onClick={() => setI(k)} aria-label={`Capítulo ${k + 1}`} />
        ))}
      </div>
      <div className="row row-between">
        <Button variant="ghost" icon={<ChevronLeft size={16} />} disabled={i === 0} onClick={() => go(-1)}>
          Anterior
        </Button>
        {i < STEPS.length - 1 ? (
          <Button variant="primary" onClick={() => go(1)}>
            Próximo <ChevronRight size={16} />
          </Button>
        ) : (
          <Button variant="primary" size="lg" loading={busy} onClick={finish} icon={<Shield size={18} />}>
            Entrar na Toca
          </Button>
        )}
      </div>
    </div>
  );
}
