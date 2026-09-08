import { Eraser } from "lucide-react";
import {
  FLAG_PALETTE,
  countryName,
  getAtlasCountry,
} from "../../../data/atlasCountries";
import { flagRegions } from "../../../data/atlasFlags";
import type { AtlasRoundPayload } from "../../../types/game";
import Flag from "../Flag";

/*
 * Paint the flag: the country is named, its flag is drawn as empty
 * regions, and the player fills each one from the palette.
 *
 * Picking a colour then tapping a region works with both a mouse and a
 * finger, which a drag-based palette would not.
 */

type FlagPaintRoundProps = {
  payload: Extract<
    AtlasRoundPayload,
    { type: "flag_paint" }
  >;
  language: "en" | "de";
  /** Region id → colour the player has chosen so far. */
  painted: Record<string, string>;
  activeColor: string;
  onPickColor: (
    color: string,
  ) => void;
  onPaintRegion: (
    regionId: string,
  ) => void;
  onClear: () => void;
  disabled: boolean;
  revealed: boolean;
  /** Caption for the real flag shown alongside on the reveal. */
  compareLabel: string;
};

function FlagPaintRound({
  payload,
  language,
  painted,
  activeColor,
  onPickColor,
  onPaintRegion,
  onClear,
  disabled,
  revealed,
  compareLabel,
}: FlagPaintRoundProps) {
  const country = getAtlasCountry(
    payload.countryId,
  );

  if (!country) {
    return null;
  }

  const regions = flagRegions(
    country.flag,
  );

  const paintedCount =
    regions.filter(
      (region) =>
        painted[region.id],
    ).length;

  return (
    <div className="atlasPaintRound">
      <strong className="atlasPromptCountry">
        {countryName(
          country,
          language,
        )}
      </strong>

      <div className="atlasPaintStage">
        <div className="atlasPaintFlag">
          <Flag
            spec={country.flag}
            regionColors={painted}
            onRegionClick={
              disabled
                ? undefined
                : onPaintRegion
            }
          />
        </div>

        {revealed && (
          <div className="atlasPaintCompare">
            <span className="atlasPaintCompareLabel">
              {compareLabel}
            </span>

            <div className="atlasPaintFlag">
              <Flag
                spec={country.flag}
              />
            </div>
          </div>
        )}
      </div>

      {!revealed && (
        <>
          <div className="atlasPalette">
            {Object.entries(
              FLAG_PALETTE,
            ).map(
              ([name, color]) => (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  disabled={disabled}
                  className={`atlasSwatch ${
                    activeColor ===
                    color
                      ? "selected"
                      : ""
                  }`}
                  style={{
                    background:
                      color,
                  }}
                  onClick={() =>
                    onPickColor(
                      color,
                    )
                  }
                />
              ),
            )}

            <button
              type="button"
              className="atlasSwatch atlasSwatchClear"
              disabled={
                disabled ||
                paintedCount === 0
              }
              onClick={onClear}
            >
              <Eraser size={16} />
            </button>
          </div>

          <div className="atlasPaintProgress">
            {paintedCount} /{" "}
            {regions.length}
          </div>
        </>
      )}
    </div>
  );
}

export default FlagPaintRound;
