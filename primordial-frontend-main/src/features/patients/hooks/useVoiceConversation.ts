import { useCallback, useEffect, useRef, useState } from "react";
import {
  voiceServerMessageSchema,
  voiceStatusSchema,
  type VoiceLatency,
  type VoiceUiState,
} from "../types/patientVoice.types";

const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

const SILENCE_MS = 900;
const NO_SPEECH_TIMEOUT_MS = 15_000;
const VOICE_THRESHOLD = 0.025;

type UseVoiceConversationParams = {
  clinicId?: string | null;
  patientId?: string | null;
};

function websocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/voice/ws`;
}

function supportedMimeType() {
  return MIME_TYPES.find((mime) => MediaRecorder.isTypeSupported(mime));
}

export function useVoiceConversation({
  clinicId,
  patientId,
}: UseVoiceConversationParams = {}) {
  const [uiState, setUiState] = useState<VoiceUiState>("checking");
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");
  const [latency, setLatency] = useState<VoiceLatency>();
  const [continuous, setContinuous] = useState(true);
  const [error, setError] = useState<string>();

  const socketRef = useRef<WebSocket | undefined>(undefined);
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const contextRef = useRef<AudioContext | undefined>(undefined);
  const animationRef = useRef<number | undefined>(undefined);
  const pendingChunksRef = useRef<Promise<void>[]>([]);
  const responseAudioRef = useRef<Blob[]>([]);
  const playerRef = useRef<HTMLAudioElement | undefined>(undefined);
  const objectUrlRef = useRef<string | undefined>(undefined);
  const speechStartedRef = useRef(false);
  const lastSpeechAtRef = useRef(0);
  const listeningStartedAtRef = useRef(0);
  const continuousRef = useRef(continuous);
  const beginCaptureRef = useRef<() => Promise<void>>(async () => undefined);
  const intentionalCloseRef = useRef(false);

  useEffect(() => {
    continuousRef.current = continuous;
  }, [continuous]);

  const releaseMicrophone = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = undefined;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
    void contextRef.current?.close();
    contextRef.current = undefined;
    recorderRef.current = undefined;
    setLevel(0);
  }, []);

  const releasePlayback = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.src = "";
      playerRef.current = undefined;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = undefined;
    }
    responseAudioRef.current = [];
  }, []);

  const stopCapture = useCallback(
    (commit: boolean) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") return;
      recorder.onstop = async () => {
        await Promise.allSettled(pendingChunksRef.current);
        pendingChunksRef.current = [];
        socketRef.current?.send(JSON.stringify({ type: commit ? "commit" : "cancel" }));
        releaseMicrophone();
        if (commit) setUiState("processing");
        else setUiState("idle");
      };
      recorder.stop();
    },
    [releaseMicrophone],
  );

  const monitorVoiceActivity = useCallback(
    (analyser: AnalyserNode) => {
      const samples = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          energy += normalized * normalized;
        }
        const rms = Math.sqrt(energy / samples.length);
        setLevel(Math.min(1, rms / 0.18));
        const now = performance.now();
        if (rms >= VOICE_THRESHOLD) {
          speechStartedRef.current = true;
          lastSpeechAtRef.current = now;
        }
        if (
          speechStartedRef.current &&
          now - lastSpeechAtRef.current >= SILENCE_MS
        ) {
          stopCapture(true);
          return;
        }
        if (
          !speechStartedRef.current &&
          now - listeningStartedAtRef.current >= NO_SPEECH_TIMEOUT_MS
        ) {
          stopCapture(false);
          setError("Nenhuma fala foi detectada.");
          return;
        }
        animationRef.current = requestAnimationFrame(tick);
      };
      animationRef.current = requestAnimationFrame(tick);
    },
    [stopCapture],
  );

  const connect = useCallback(async () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return socketRef.current;
    }
    return await new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(websocketUrl());
      socket.binaryType = "blob";
      socket.onopen = () => {
        socketRef.current = socket;
      };
      socket.onerror = () => reject(new Error("Canal de voz indisponível."));
      socket.onclose = () => {
        socketRef.current = undefined;
        if (!intentionalCloseRef.current) {
          setUiState((current) =>
            current === "unavailable" ? current : "error",
          );
        }
      };
      socket.onmessage = (event) => {
        if (event.data instanceof Blob) {
          responseAudioRef.current.push(event.data);
          return;
        }
        try {
          const message = voiceServerMessageSchema.parse(JSON.parse(event.data));
          if (message.type === "ready") {
            setUiState("idle");
            resolve(socket);
          } else if (message.type === "listening") {
            setUiState("listening");
          } else if (message.type === "processing") {
            setUiState("processing");
          } else if (message.type === "result") {
            setTranscript(message.transcript);
            setAnswer(message.answer);
            setLatency(message.latency_ms);
          } else if (message.type === "audio_start") {
            responseAudioRef.current = [];
          } else if (message.type === "audio_end") {
            const blob = new Blob(responseAudioRef.current, { type: "audio/wav" });
            responseAudioRef.current = [];
            const url = URL.createObjectURL(blob);
            objectUrlRef.current = url;
            const player = new Audio(url);
            playerRef.current = player;
            setUiState("speaking");
            player.onended = () => {
              releasePlayback();
              setUiState("idle");
              if (continuousRef.current) {
                window.setTimeout(() => void beginCaptureRef.current(), 250);
              }
            };
            player.onerror = () => {
              releasePlayback();
              setError("O navegador não conseguiu reproduzir a resposta.");
              setUiState("error");
            };
            void player.play().catch(() => {
              releasePlayback();
              setError("O navegador bloqueou a reprodução automática.");
              setUiState("error");
            });
          } else if (message.type === "error") {
            setError("A conversa por voz foi interrompida com segurança.");
            setUiState("error");
          }
        } catch {
          setError("O servidor enviou uma resposta de voz inválida.");
          setUiState("error");
        }
      };
    });
  }, [releasePlayback]);

  const beginCapture = useCallback(async () => {
    setError(undefined);
    releasePlayback();
    const mimeType = supportedMimeType();
    if (!mimeType || !navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador não oferece captura de voz compatível.");
      setUiState("unavailable");
      return;
    }
    try {
      setUiState("requesting_permission");
      const socket = await connect();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      contextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 48_000,
      });
      recorderRef.current = recorder;
      pendingChunksRef.current = [];
      speechStartedRef.current = false;
      lastSpeechAtRef.current = 0;
      listeningStartedAtRef.current = performance.now();
      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        const pending = event.data.arrayBuffer().then((buffer) => {
          if (socket.readyState === WebSocket.OPEN) socket.send(buffer);
        });
        pendingChunksRef.current.push(pending);
      };
      socket.send(
        JSON.stringify({
          type: "start",
          mime_type: mimeType,
          clinic_id: clinicId || null,
          patient_id: patientId || null,
        }),
      );
      recorder.start(250);
      setUiState("listening");
      monitorVoiceActivity(analyser);
    } catch (reason) {
      releaseMicrophone();
      const denied =
        reason instanceof DOMException && reason.name === "NotAllowedError";
      setError(
        denied
          ? "A permissão do microfone foi negada."
          : "Não foi possível iniciar o canal de voz.",
      );
      setUiState("error");
    }
  }, [clinicId, connect, monitorVoiceActivity, patientId, releaseMicrophone, releasePlayback]);

  useEffect(() => {
    beginCaptureRef.current = beginCapture;
  }, [beginCapture]);

  useEffect(() => {
    let active = true;
    void fetch("/voice/status", {
      credentials: "same-origin",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return voiceStatusSchema.parse(await response.json());
      })
      .then((status) => {
        if (!active) return;
        if (!status.enabled || !status.available) {
          setUiState("unavailable");
          setError("O modo de voz ainda não foi habilitado no servidor.");
        } else {
          setUiState("idle");
        }
      })
      .catch(() => {
        if (active) {
          setUiState("unavailable");
          setError("Não foi possível verificar o serviço de voz.");
        }
      });
    return () => {
      active = false;
      intentionalCloseRef.current = true;
      stopCapture(false);
      releaseMicrophone();
      releasePlayback();
      socketRef.current?.close(1000, "component_unmounted");
      socketRef.current = undefined;
    };
  }, [releaseMicrophone, releasePlayback, stopCapture]);

  return {
    uiState,
    level,
    transcript,
    answer,
    latency,
    continuous,
    error,
    setContinuous,
    beginCapture,
    stopCapture: () => stopCapture(true),
    interrupt: () => {
      releasePlayback();
      setUiState("idle");
      void beginCapture();
    },
  };
}
