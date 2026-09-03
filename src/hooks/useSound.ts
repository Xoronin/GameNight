import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  isSoundEnabled,
  setSoundEnabled,
} from "../utils/sounds";

export function useSound() {
  const [enabled, setEnabled] =
    useState(isSoundEnabled);

  useEffect(() => {
    const listener = (
      event: Event,
    ) => {
      setEnabled(
        (
          event as CustomEvent<boolean>
        ).detail,
      );
    };

    window.addEventListener(
      "game-night-sound-change",
      listener,
    );

    return () => {
      window.removeEventListener(
        "game-night-sound-change",
        listener,
      );
    };
  }, []);

  const toggle = useCallback(
    () => {
      setSoundEnabled(
        !isSoundEnabled(),
      );
    },
    [],
  );

  return { enabled, toggle };
}
