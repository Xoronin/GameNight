import {
  useEffect,
  useRef,
  useState,
} from "react";
import { playFanfare } from "../utils/sounds";

/*
 * A firework display for clearing a whole board.
 *
 * Canvas rather than DOM nodes: a few hundred particles as elements
 * would thrash layout, where a canvas is one composited surface. It is
 * fixed over the page and ignores pointer events, so the result screen
 * underneath stays usable while it plays.
 *
 * Fires once per `triggerKey`, so a re-render or a repeated realtime
 * event cannot set it off twice for the same round.
 */

type FireworksProps = {
  /** A new non-null value launches a display; null does nothing. */
  triggerKey: string | null;
  durationMs?: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

type Rocket = {
  x: number;
  y: number;
  /* Previous position, so the trail draws as a line rather than as
   * dots spaced a frame's travel apart. */
  px: number;
  py: number;
  vy: number;
  targetY: number;
  color: string;
};

const COLORS = [
  "#a78bfa",
  "#60a5fa",
  "#4ade80",
  "#fcd116",
  "#fb7185",
  "#f472b6",
  "#22d3ee",
];

const GRAVITY = 0.035;

function prefersReducedMotion() {
  return window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
}

function Fireworks({
  triggerKey,
  durationMs = 3200,
}: FireworksProps) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    );

  const [firedKey, setFiredKey] =
    useState<string | null>(null);

  const [running, setRunning] =
    useState(false);

  /*
   * Read once on mount rather than per render, and consulted before
   * `running` is ever set — so under reduced motion the canvas is never
   * mounted at all, instead of being started and immediately stopped.
   */
  const [reduceMotion] = useState(
    prefersReducedMotion,
  );

  /*
   * Adjusted during render (React's pattern for reacting to a changed
   * value) so the canvas mounts on the same frame the board clears.
   */
  if (
    triggerKey &&
    triggerKey !== firedKey
  ) {
    setFiredKey(triggerKey);

    if (!reduceMotion) {
      setRunning(true);
    }
  }

  /* The sound plays even when the animation is suppressed. */
  useEffect(() => {
    if (!firedKey) {
      return;
    }

    playFanfare();
  }, [firedKey]);

  useEffect(() => {
    if (!running) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    const ratio = Math.min(
      window.devicePixelRatio || 1,
      2,
    );

    const resize = () => {
      canvas.width =
        window.innerWidth * ratio;

      canvas.height =
        window.innerHeight * ratio;

      context.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0,
      );
    };

    resize();
    window.addEventListener(
      "resize",
      resize,
    );

    const width = () =>
      window.innerWidth;

    const height = () =>
      window.innerHeight;

    const rockets: Rocket[] = [];
    const particles: Particle[] = [];

    const launch = () => {
      const color =
        COLORS[
          Math.floor(
            Math.random() *
              COLORS.length,
          )
        ];

      const x =
        width() * 0.15 +
        Math.random() *
          width() *
          0.7;

      rockets.push({
        x,
        y: height(),
        px: x,
        py: height(),
        vy:
          -(
            height() / 90 +
            Math.random() * 2
          ),
        targetY:
          height() * 0.12 +
          Math.random() *
            height() *
            0.4,
        color,
      });
    };

    const explode = (
      rocket: Rocket,
    ) => {
      const count =
        46 +
        Math.floor(
          Math.random() * 26,
        );

      for (
        let index = 0;
        index < count;
        index += 1
      ) {
        const angle =
          (Math.PI * 2 * index) /
            count +
          Math.random() * 0.2;

        const speed =
          1.4 +
          Math.random() * 3.1;

        const life =
          52 +
          Math.random() * 34;

        particles.push({
          x: rocket.x,
          y: rocket.y,
          vx:
            Math.cos(angle) *
            speed,
          vy:
            Math.sin(angle) *
            speed,
          life,
          maxLife: life,
          color: rocket.color,
          size:
            1.8 +
            Math.random() * 2.2,
        });
      }
    };

    const startedAt =
      performance.now();

    /* Stop launching early so the last burst can finish on screen. */
    const lastLaunchAt =
      durationMs - 900;

    let nextLaunchAt = 0;
    let frame = 0;

    const tick = (now: number) => {
      const elapsed =
        now - startedAt;

      if (
        elapsed < lastLaunchAt &&
        elapsed >= nextLaunchAt
      ) {
        launch();

        /* Occasional double burst, so it isn't metronomic. */
        if (Math.random() < 0.35) {
          launch();
        }

        nextLaunchAt =
          elapsed +
          260 +
          Math.random() * 320;
      }

      /* Fade the previous frame instead of clearing, leaving trails. */
      context.globalCompositeOperation =
        "destination-out";

      context.fillStyle =
        "rgba(0, 0, 0, 0.22)";

      context.fillRect(
        0,
        0,
        width(),
        height(),
      );

      context.globalCompositeOperation =
        "lighter";

      for (
        let index =
          rockets.length - 1;
        index >= 0;
        index -= 1
      ) {
        const rocket =
          rockets[index];

        rocket.px = rocket.x;
        rocket.py = rocket.y;

        rocket.y += rocket.vy;
        rocket.vy += GRAVITY;

        context.strokeStyle =
          rocket.color;

        context.lineWidth = 2.4;
        context.lineCap = "round";

        context.beginPath();
        context.moveTo(
          rocket.px,
          rocket.py,
        );
        context.lineTo(
          rocket.x,
          rocket.y,
        );
        context.stroke();

        if (
          rocket.y <=
            rocket.targetY ||
          rocket.vy >= 0
        ) {
          explode(rocket);
          rockets.splice(index, 1);
        }
      }

      for (
        let index =
          particles.length - 1;
        index >= 0;
        index -= 1
      ) {
        const particle =
          particles[index];

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += GRAVITY;
        particle.vx *= 0.985;
        particle.vy *= 0.985;
        particle.life -= 1;

        if (particle.life <= 0) {
          particles.splice(
            index,
            1,
          );

          continue;
        }

        context.globalAlpha =
          Math.max(
            0,
            particle.life /
              particle.maxLife,
          );

        context.fillStyle =
          particle.color;

        context.beginPath();
        context.arc(
          particle.x,
          particle.y,
          particle.size,
          0,
          Math.PI * 2,
        );
        context.fill();
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation =
        "source-over";

      const finished =
        elapsed >= durationMs &&
        particles.length === 0 &&
        rockets.length === 0;

      if (finished) {
        setRunning(false);

        return;
      }

      frame =
        window.requestAnimationFrame(
          tick,
        );
    };

    frame =
      window.requestAnimationFrame(
        tick,
      );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );

      window.removeEventListener(
        "resize",
        resize,
      );
    };
  }, [running, firedKey, durationMs]);

  if (!running) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fireworks"
      aria-hidden
    />
  );
}

export default Fireworks;
