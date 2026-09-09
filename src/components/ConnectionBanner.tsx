import {
  AnimatePresence,
  motion,
} from "motion/react";
import {
  CloudOff,
  RefreshCw,
} from "lucide-react";
import { useConnection } from "../hooks/useConnection";
import { useLanguage } from "../hooks/useLanguage";
import "../styles/connection.css";

/*
 * A game that has stopped hearing from the server looks exactly like a
 * game where nobody has answered yet. This says which it is, so the answer
 * to "is it frozen?" is on screen rather than guessed at.
 */
function ConnectionBanner() {
  const { status } =
    useConnection();

  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {status !== "live" && (
        <motion.div
          className={`connectionBanner ${status}`}
          role="status"
          initial={{
            opacity: 0,
            y: -12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: -12,
          }}
        >
          {status ===
          "offline" ? (
            <CloudOff size={16} />
          ) : (
            <RefreshCw
              className="connectionSpinner"
              size={16}
            />
          )}

          {t(
            status === "offline"
              ? "common.offline"
              : "common.reconnecting",
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ConnectionBanner;
