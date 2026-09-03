const SOUND_ENABLED_KEY =
  "game-night-sound-enabled";

let audioContext: AudioContext | null =
  null;

function getAudioContext() {
  if (!audioContext) {
    audioContext =
      new AudioContext();
  }

  if (
    audioContext.state ===
    "suspended"
  ) {
    void audioContext.resume();
  }

  return audioContext;
}

export function isSoundEnabled(): boolean {
  return (
    localStorage.getItem(
      SOUND_ENABLED_KEY,
    ) !== "false"
  );
}

export function setSoundEnabled(
  enabled: boolean,
) {
  localStorage.setItem(
    SOUND_ENABLED_KEY,
    String(enabled),
  );

  window.dispatchEvent(
    new CustomEvent(
      "game-night-sound-change",
      { detail: enabled },
    ),
  );
}

type Tone = {
  frequency: number;
  duration: number;
  delay?: number;
  type?: OscillatorType;
  gain?: number;
};

function playTones(tones: Tone[]) {
  if (!isSoundEnabled()) {
    return;
  }

  try {
    const context =
      getAudioContext();

    const now =
      context.currentTime;

    for (const tone of tones) {
      const oscillator =
        context.createOscillator();

      const gainNode =
        context.createGain();

      oscillator.type =
        tone.type ?? "sine";

      oscillator.frequency.value =
        tone.frequency;

      const startTime =
        now +
        (tone.delay ?? 0);

      const endTime =
        startTime +
        tone.duration;

      const peakGain =
        tone.gain ?? 0.12;

      gainNode.gain
        .setValueAtTime(
          0,
          startTime,
        );

      gainNode.gain
        .linearRampToValueAtTime(
          peakGain,
          startTime + 0.015,
        );

      gainNode.gain
        .exponentialRampToValueAtTime(
          0.0001,
          endTime,
        );

      oscillator.connect(
        gainNode,
      );

      gainNode.connect(
        context.destination,
      );

      oscillator.start(
        startTime,
      );

      oscillator.stop(
        endTime + 0.02,
      );
    }
  } catch {
    /*
     * Audio can fail to init in some
     * environments (autoplay policies,
     * headless testing, ...) — sound
     * is a nice-to-have, never worth
     * breaking gameplay over.
     */
  }
}

export function playTick() {
  playTones([
    {
      frequency: 880,
      duration: 0.08,
      type: "square",
      gain: 0.06,
    },
  ]);
}

export function playCorrect() {
  playTones([
    {
      frequency: 523.25,
      duration: 0.12,
    },
    {
      frequency: 783.99,
      duration: 0.18,
      delay: 0.1,
    },
  ]);
}

export function playIncorrect() {
  playTones([
    {
      frequency: 220,
      duration: 0.22,
      type: "sawtooth",
      gain: 0.08,
    },
  ]);
}

export function playReveal() {
  playTones([
    {
      frequency: 660,
      duration: 0.1,
      gain: 0.08,
    },
  ]);
}

export function playWin() {
  playTones([
    {
      frequency: 523.25,
      duration: 0.12,
    },
    {
      frequency: 659.25,
      duration: 0.12,
      delay: 0.11,
    },
    {
      frequency: 783.99,
      duration: 0.12,
      delay: 0.22,
    },
    {
      frequency: 1046.5,
      duration: 0.3,
      delay: 0.33,
    },
  ]);
}
