import {
  Volume2,
  VolumeX,
} from "lucide-react";
import { useSound } from "../hooks/useSound";
import "../styles/soundToggle.css";

function SoundToggle() {
  const { enabled, toggle } =
    useSound();

  return (
    <button
      type="button"
      className="soundToggle"
      onClick={toggle}
      aria-label={
        enabled
          ? "Mute sound"
          : "Unmute sound"
      }
      title={
        enabled
          ? "Mute sound"
          : "Unmute sound"
      }
    >
      {enabled ? (
        <Volume2 size={16} />
      ) : (
        <VolumeX size={16} />
      )}
    </button>
  );
}

export default SoundToggle;
