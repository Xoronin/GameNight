import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
} from "motion/react";
import {
  Bug,
  Check,
  Lightbulb,
  MessageSquarePlus,
  X,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage";
import {
  FeedbackError,
  redactRoute,
  sendFeedback,
  type FeedbackKind,
} from "../services/feedbackService";
import { getPlayer } from "../utils/gameUtils";
import "../styles/feedback.css";

/*
 * Reporting a bug should not mean leaving the game to open GitHub, so this
 * files the issue from wherever the player already is — and carries the
 * screen they were on, which is the part they never remember to include.
 */

/** Matches the endpoint, so the button disables before a wasted round trip. */
const MIN_MESSAGE_LENGTH = 10;

function FeedbackButton() {
  const { t, language } =
    useLanguage();

  const location = useLocation();

  const dialogId = useId();

  const [open, setOpen] =
    useState(false);

  const [kind, setKind] =
    useState<FeedbackKind>("bug");

  const [message, setMessage] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [issueUrl, setIssueUrl] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(
      null,
    );

  useEffect(() => {
    if (!open) {
      return;
    }

    /* Escape closes it, the same as the button does. */
    const onKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    textareaRef.current?.focus();

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
    };
  }, [open]);

  const openDialog = () => {
    setIssueUrl(null);
    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    setSending(true);
    setError(null);

    try {
      const url =
        await sendFeedback({
          kind,
          message,
          from:
            getPlayer()?.name ??
            undefined,
          route: redactRoute(
            location.pathname,
          ),
          language,
        });

      setIssueUrl(url);
      setMessage("");
    } catch (caught) {
      setError(
        caught instanceof
          FeedbackError
          ? caught.translationKey
          : "feedback.errorFailed",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="feedbackTrigger"
        onClick={openDialog}
        aria-haspopup="dialog"
        title={t(
          "feedback.button",
        )}
      >
        <MessageSquarePlus
          size={18}
        />

        <span className="feedbackTriggerLabel">
          {t("feedback.button")}
        </span>
      </button>

      {/*
       * Rendered on the body rather than in place: the header sets a
       * backdrop-filter, and that makes it the containing block for any
       * position: fixed descendant — the overlay would then be pinned to
       * the header rather than the viewport, off-screen and unclickable.
       */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="feedbackBackdrop"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{ opacity: 0 }}
              onClick={() =>
                setOpen(false)
              }
            >
              <motion.div
                className="feedbackDialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby={
                  dialogId
                }
                initial={{
                  opacity: 0,
                  y: 16,
                  scale: 0.97,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 8,
                  scale: 0.98,
                }}
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <div className="feedbackHead">
                  <h2 id={dialogId}>
                    {t(
                      "feedback.title",
                    )}
                  </h2>

                  <button
                    type="button"
                    className="feedbackClose"
                    onClick={() =>
                      setOpen(false)
                    }
                    aria-label={t(
                      "feedback.close",
                    )}
                  >
                    <X size={18} />
                  </button>
                </div>

                {issueUrl ? (
                  <div className="feedbackDone">
                    <Check
                      size={32}
                    />

                    <p>
                      {t(
                        "feedback.thanks",
                      )}
                    </p>

                    <a
                      href={
                        issueUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t(
                        "feedback.viewIssue",
                      )}
                    </a>
                  </div>
                ) : (
                  <>
                    <p className="feedbackIntro">
                      {t(
                        "feedback.intro",
                      )}
                    </p>

                    <div
                      className="feedbackKinds"
                      role="radiogroup"
                    >
                      {(
                        [
                          "bug",
                          "idea",
                        ] as const
                      ).map(
                        (option) => (
                          <button
                            key={
                              option
                            }
                            type="button"
                            role="radio"
                            aria-checked={
                              kind ===
                              option
                            }
                            className={`feedbackKind ${
                              kind ===
                              option
                                ? "selected"
                                : ""
                            }`}
                            onClick={() =>
                              setKind(
                                option,
                              )
                            }
                          >
                            {option ===
                            "bug" ? (
                              <Bug
                                size={
                                  16
                                }
                              />
                            ) : (
                              <Lightbulb
                                size={
                                  16
                                }
                              />
                            )}

                            {t(
                              option ===
                                "bug"
                                ? "feedback.kindBug"
                                : "feedback.kindIdea",
                            )}
                          </button>
                        ),
                      )}
                    </div>

                    <textarea
                      ref={
                        textareaRef
                      }
                      className="feedbackText"
                      rows={5}
                      maxLength={
                        2000
                      }
                      value={
                        message
                      }
                      onChange={(
                        event,
                      ) =>
                        setMessage(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder={t(
                        kind ===
                          "bug"
                          ? "feedback.placeholderBug"
                          : "feedback.placeholderIdea",
                      )}
                    />

                    <p className="feedbackHint">
                      {t(
                        "feedback.hintPublic",
                      )}
                    </p>

                    {error && (
                      <p
                        className="feedbackError"
                        role="alert"
                      >
                        {t(error)}
                      </p>
                    )}

                    <button
                      type="button"
                      className="primaryButton feedbackSend"
                      disabled={
                        sending ||
                        message.trim()
                          .length <
                          MIN_MESSAGE_LENGTH
                      }
                      onClick={() => {
                        void submit();
                      }}
                    >
                      {t(
                        sending
                          ? "feedback.sending"
                          : "feedback.send",
                      )}
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

export default FeedbackButton;
