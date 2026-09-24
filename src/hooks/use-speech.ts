"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/* Minimal typings for the Web Speech API (not in lib.dom for all TS versions). */
type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

export type SpeechState = "idle" | "listening" | "error" | "unsupported";

/**
 * Speech-to-text via the browser's Web Speech API (pt-BR), with live interim transcript.
 * Ends automatically after a pause; `onFinal` receives the full utterance.
 */
export function useSpeech(onFinal: (text: string) => void) {
  const [state, setState] = useState<SpeechState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const finalText = useRef("");
  const cb = useRef(onFinal);
  useLayoutEffect(() => {
    cb.current = onFinal;
  });

  const supported = typeof window !== "undefined" && !!getRecognition();

  const stop = useCallback(() => rec.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) {
      setState("unsupported");
      return;
    }
    rec.current?.abort();
    const r = new Ctor();
    r.lang = "pt-BR";
    r.continuous = false;
    r.interimResults = true;
    finalText.current = "";
    setTranscript("");
    setError(null);
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText.current += res[0].transcript;
        else interim += res[0].transcript;
      }
      setTranscript((finalText.current + " " + interim).trim());
    };
    r.onerror = (e) => {
      const map: Record<string, string> = {
        "not-allowed": "Permita o acesso ao microfone para falar com a AIVA.",
        "no-speech": "Não ouvi nada. Tente de novo.",
        network: "Falha de rede no reconhecimento de voz.",
        "audio-capture": "Nenhum microfone encontrado.",
      };
      if (e.error === "aborted") return;
      setError(map[e.error] ?? "Não consegui ouvir. Tente novamente.");
      setState("error");
    };
    r.onend = () => {
      const text = finalText.current.trim();
      rec.current = null;
      setState((s) => (s === "error" ? s : "idle"));
      if (text) cb.current(text);
    };
    rec.current = r;
    try {
      r.start();
      setState("listening");
    } catch {
      setState("error");
      setError("Não foi possível iniciar o microfone.");
    }
  }, []);

  useEffect(() => () => rec.current?.abort(), []);

  return { state, transcript, error, start, stop, supported };
}
