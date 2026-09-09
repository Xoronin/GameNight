import { Check, X } from "lucide-react";
import type { CSSProperties } from "react";
import {
  capitalName,
  countryName,
  getAtlasCountry,
} from "../../../data/atlasCountries";
import type { AtlasRoundPayload } from "../../../types/game";
import MapRegionView from "../MapRegion";

/*
 * One country lit up on a region map; name it, or name its capital.
 *
 * Which of the two it asks for is decided when the round is generated,
 * so the same mode plays differently from round to round.
 */

type MapChoiceRoundProps = {
  payload: Extract<
    AtlasRoundPayload,
    { type: "map_choice" }
  >;
  language: "en" | "de";
  selectedId: string | null;
  onSelect: (
    countryId: string,
  ) => void;
  disabled: boolean;
  revealed: boolean;
  loadingLabel: string;
};

function MapChoiceRound({
  payload,
  language,
  selectedId,
  onSelect,
  disabled,
  revealed,
  loadingLabel,
}: MapChoiceRoundProps) {
  return (
    <div className="atlasChoiceRound">
      <MapRegionView
        region={payload.region}
        highlightId={
          payload.countryId
        }
        loadingLabel={loadingLabel}
      />

      <div className="atlasOptions atlasOptionsText">
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
                  onSelect(optionId)
                }
              >
                <span className="atlasOptionText">
                  {payload.asks ===
                  "capital"
                    ? capitalName(
                        option,
                        language,
                      )
                    : countryName(
                        option,
                        language,
                      )}
                </span>

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

export default MapChoiceRound;
