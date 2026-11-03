/**
 * Lecture de flux PCM brut (Gemini Live) via Web Audio.
 *
 * Le backend annonce la fréquence réelle dans le cadre `AUDIO_META`
 * (24 000 Hz par défaut). La supposer à 16 kHz produit une lecture ~1,5× trop
 * rapide — cette implémentation accepte donc la fréquence annoncée.
 *
 * Sans `AudioContext` (SSR, navigateur ancien), le lecteur est un no-op sûr.
 */

export interface PcmPlayer {
  /** Fréquence d'échantillonnage courante du flux. */
  readonly sampleRate: number;
  readonly playing: boolean;
  /** Met à jour la fréquence (à appeler depuis `onAudioMeta`). */
  updateSampleRate(sampleRate: number): void;
  /** Ajoute un bloc PCM 16 bits signé little-endian à la file de lecture. */
  enqueue(chunk: Uint8Array | ArrayBuffer): void;
  /** Coupe la lecture en cours et vide la file. */
  stop(): void;
  /**
   * Libère le `AudioContext`. À appeler au démontage : les navigateurs
   * plafonnent le nombre de contextes simultanés (~6) et un nouveau lecteur
   * par session les épuise.
   */
  close(): void;
}

export interface PcmPlayerOptions {
  /** Défaut : 24 000 Hz (valeur annoncée par le backend). */
  sampleRate?: number;
  /** Défaut : 1 (mono). */
  channels?: number;
  /** Appelé quand la file se vide. */
  onEnded?: () => void;
}

export function createPcmPlayer(options: PcmPlayerOptions = {}): PcmPlayer {
  const AudioCtor: typeof AudioContext | undefined =
    typeof window !== 'undefined'
      ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;

  let sampleRate = options.sampleRate && options.sampleRate > 0 ? options.sampleRate : 24000;
  const channels = Math.max(1, options.channels ?? 1);
  let context: AudioContext | null = null;
  let nextStartTime = 0;
  const activeSources = new Set<AudioBufferSourceNode>();

  const ensureContext = (): AudioContext | null => {
    if (!AudioCtor) return null;
    if (!context) {
      try {
        context = new AudioCtor();
      } catch {
        return null;
      }
    }
    if (context.state === 'suspended') {
      void context.resume().catch(() => {});
    }
    return context;
  };

  const stopAll = (): void => {
    for (const source of activeSources) {
      try {
        source.stop();
      } catch {
        // Déjà arrêté.
      }
    }
    activeSources.clear();
    nextStartTime = 0;
  };

  return {
    get sampleRate() {
      return sampleRate;
    },

    get playing() {
      return activeSources.size > 0;
    },

    updateSampleRate(rate: number) {
      if (Number.isFinite(rate) && rate > 0) sampleRate = rate;
    },

    enqueue(chunk: Uint8Array | ArrayBuffer) {
      const audioContext = ensureContext();
      if (!audioContext) return;

      const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
      const frames = Math.floor(bytes.byteLength / (2 * channels));
      if (frames <= 0) return;

      let buffer: AudioBuffer;
      try {
        buffer = audioContext.createBuffer(channels, frames, sampleRate);
      } catch {
        // Fréquence non supportée par le navigateur.
        return;
      }

      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let channel = 0; channel < channels; channel++) {
        const data = buffer.getChannelData(channel);
        for (let frame = 0; frame < frames; frame++) {
          const sample = view.getInt16((frame * channels + channel) * 2, true);
          // PCM16 signé → flottant [-1, 1]
          data[frame] = sample < 0 ? sample / 0x8000 : sample / 0x7fff;
        }
      }

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);

      const startAt = Math.max(audioContext.currentTime + 0.02, nextStartTime);
      source.start(startAt);
      nextStartTime = startAt + buffer.duration;

      activeSources.add(source);
      source.onended = () => {
        activeSources.delete(source);
        if (activeSources.size === 0) options.onEnded?.();
      };
    },

    stop() {
      stopAll();
    },

    close() {
      stopAll();
      if (context) {
        void context.close().catch(() => {});
        context = null;
      }
    }
  };
}
