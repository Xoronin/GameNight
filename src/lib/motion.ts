import type { Transition, Variants } from "motion/react";

/**
 * Shared animation vocabulary.
 *
 * The CSS layer in `styles/global.css` owns entrances and hover/press
 * feedback. Motion is reserved for what CSS cannot express: exit
 * animations, layout moves, and value-driven transitions.
 */

/** Matches the cubic-bezier used by the CSS keyframes. */
export const EASE_OUT = [
  0.16, 1, 0.3, 1,
] as const;

export const softSpring: Transition =
  {
    type: "spring",
    stiffness: 320,
    damping: 32,
    mass: 0.9,
  };

export const popSpring: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 24,
  mass: 0.7,
};

export const quickFade: Transition = {
  duration: 0.22,
  ease: EASE_OUT,
};

/**
 * A row entering or leaving a list (players, scores, guesses).
 *
 * Each row carries its own `initial`/`animate` rather than inheriting
 * them from a `staggerChildren` container: a row added after the
 * container has settled would adopt the container's finished state and
 * never play its entrance, which is precisely the case that matters
 * here (a player joining a lobby mid-session). Bulk entrances are
 * staggered in CSS instead, via `--rowIndex`.
 */
export const listItemVariants: Variants =
  {
    initial: {
      opacity: 0,
      y: -8,
      scale: 0.97,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: softSpring,
    },
    exit: {
      opacity: 0,
      x: 24,
      scale: 0.95,
      transition: quickFade,
    },
  };

/** One round/question/phase replacing another. */
export const phaseVariants: Variants =
  {
    initial: {
      opacity: 0,
      y: 16,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.34,
        ease: EASE_OUT,
      },
    },
    exit: {
      opacity: 0,
      y: -16,
      transition: {
        duration: 0.18,
        ease: "easeIn",
      },
    },
  };

/** A result banner or badge appearing with weight. */
export const revealVariants: Variants =
  {
    initial: {
      opacity: 0,
      scale: 0.85,
      y: 8,
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: popSpring,
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: quickFade,
    },
  };
