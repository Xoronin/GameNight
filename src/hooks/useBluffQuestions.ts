import {
  useEffect,
  useState,
} from "react";
import {
  getBluffQuestions,
} from "../services/bluffQuestionService";
import type {
  BluffQuestion,
} from "../types/bluffQuestion";

export function useBluffQuestions() {
  const [
    questions,
    setQuestions,
  ] = useState<
    BluffQuestion[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    let active = true;

    const load =
      async () => {
        try {
          const loaded =
            await getBluffQuestions();

          if (!active) {
            return;
          }

          setQuestions(
            loaded,
          );

          setError(null);
        } catch (
          caughtError
        ) {
          if (!active) {
            return;
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load Bluff questions.",
          );
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return {
    questions,
    loading,
    error,
  };
}