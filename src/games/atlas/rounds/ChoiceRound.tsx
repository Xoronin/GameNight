import { Check, X } from "lucide-react";
import type { CSSProperties } from "react";
import {
  capitalName,
  countryName,
  getAtlasCountry,
} from "../../../data/atlasCountries";
import type { AtlasRoundPayload } from "../../../types/game";
import Flag from "../Flag";

/*
 * The three multiple-choice round types share this view. They differ
 * only in what the prompt shows and what each option renders, so those
 * two decisions are made from the payload type rather than by having
 * three near-identical components.
 */

type ChoiceRoundProps = {
  payload: Extract<
    AtlasRoundPayload,
    {
      type:
        | "flag_choice"
        | "country_from_flag"
        | "capital_choice";
    }
  >;
  language: "en" | "de";
  selectedId: string | null;
  onSelect: (
    countryId: string,
  ) => void;
  disabled: boolean;
  revealed: boolean;
};

function ChoiceRound({
  payload,
  language,
  selectedId,
  onSelect,
  disabled,
  revealed,
}: ChoiceRoundProps) {
  const answer = getAtlasCountry(
    payload.countryId,
  );

  if (!answer) {
    return null;
  }

  const showsFlagPrompt =
    payload.type ===
    "country_from_flag";

  const optionsAreFlags =
    payload.type ===
    "flag_choice";

  return (
    <div className="atlasChoiceRound">
      <div className="atlasPrompt">
        {showsFlagPrompt ? (
          <div className="atlasPromptFlag">
            <Flag
              spec={answer.flag}
            />
          </div>
        ) : (
          <strong className="atlasPromptCountry">
            {countryName(
              answer,
              language,
            )}
          </strong>
        )}
      </div>

      <div
        className={`atlasOptions ${
          optionsAreFlags
            ? "atlasOptionsFlags"
            : "atlasOptionsText"
        }`}
      >
        {payload.optionIds.map(
          (optionId, index) => {
            const option =
              getAtlasCountry(
                optionId,
              );

            if (!option) {
              return null;
            }

            const isCorrect =
              optionId ===
              payload.countryId;

            const isMine =
              optionId ===
              selectedId;

            return (
              <button
                key={optionId}
                type="button"
                disabled={disabled}
                style={
                  {
                    "--optionIndex":
                      index,
                  } as CSSProperties
                }
                className={[
                  "atlasOption",
                  isMine
                    ? "selected"
                    : "",
                  revealed &&
                  isCorrect
                    ? "correct"
                    : "",
                  revealed &&
                  isMine &&
                  !isCorrect
                    ? "incorrect"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  onSelect(
                    optionId,
                  )
                }
              >
                {optionsAreFlags ? (
                  <span className="atlasOptionFlag">
                    <Flag
                      spec={
                        option.flag
                      }
                    />
                  </span>
                ) : (
                  <span className="atlasOptionText">
                    {payload.type ===
                    "capital_choice"
                      ? capitalName(
                          option,
                          language,
                        )
                      : countryName(
                          option,
                          language,
                        )}
                  </span>
                )}

                {revealed &&
                  isCorrect && (
                    <Check
                      className="atlasOptionMark"
                      size={18}
                    />
                  )}

                {revealed &&
                  isMine &&
                  !isCorrect && (
                    <X
                      className="atlasOptionMark"
                      size={18}
                    />
                  )}
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

export default ChoiceRound;
