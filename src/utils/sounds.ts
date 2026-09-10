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

/**
 * Your turn: a bright rising chime, deliberately unlike playCorrect so
 * "you may act now" never reads as "you got it right".
 */
export function playYourTurn() {
  playTones([
    {
      frequency: 587.33,
      duration: 0.11,
      gain: 0.09,
    },
    {
      frequency: 880,
      duration: 0.13,
      delay: 0.1,
      gain: 0.09,
    },
    {
      frequency: 1174.66,
      duration: 0.2,
      delay: 0.21,
      gain: 0.07,
    },
  ]);
}

/**
 * The clock is nearly out: two urgent low pulses, distinct from the
 * per-second playTick so the warning is not mistaken for the count.
 */
export function playTimeWarning() {
  playTones([
    {
      frequency: 392,
      duration: 0.14,
      type: "square",
      gain: 0.08,
    },
    {
      frequency: 392,
      duration: 0.2,
      delay: 0.19,
      type: "square",
      gain: 0.09,
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

/**
 * Clearing the whole board — the biggest thing that can happen in a
 * round, so it is the longest cue here: a rising run into a sustained
 * major triad, with a sparkle on top.
 */
export function playFanfare() {
  playTones([
    /* Rising run. */
    {
      frequency: 523.25,
      duration: 0.1,
      gain: 0.08,
    },
    {
      frequency: 659.25,
      duration: 0.1,
      delay: 0.09,
      gain: 0.08,
    },
    {
      frequency: 783.99,
      duration: 0.1,
      delay: 0.18,
      gain: 0.08,
    },
    {
      frequency: 1046.5,
      duration: 0.12,
      delay: 0.27,
      gain: 0.09,
    },

    /* Held triad underneath. */
    {
      frequency: 523.25,
      duration: 0.75,
      delay: 0.4,
      gain: 0.07,
    },
    {
      frequency: 659.25,
      duration: 0.75,
      delay: 0.4,
      gain: 0.06,
    },
    {
      frequency: 783.99,
      duration: 0.75,
      delay: 0.4,
      gain: 0.06,
    },
    {
      frequency: 1046.5,
      duration: 0.8,
      delay: 0.4,
      gain: 0.05,
    },

    /* Sparkle over the top. */
    {
      frequency: 1567.98,
      duration: 0.14,
      delay: 0.62,
      type: "triangle",
      gain: 0.045,
    },
    {
      frequency: 2093,
      duration: 0.22,
      delay: 0.75,
      type: "triangle",
      gain: 0.04,
    },
  ]);
}

