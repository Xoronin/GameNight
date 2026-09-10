import { Check, Heart, X } from "lucide-react";
import {
  capitalName,
  countryName,
  getAtlasCountry,
} from "../../../data/atlasCountries";
import type { AtlasPlacement, AtlasRoundPayload } from "../../../types/game";
import type { RoomPlayer } from "../../../types/player";
import Flag from "../Flag";
import { useBoardDrag } from "../useBoardDrag";

/*
 * The shared, turn-based capital board.
 *
 * Ten countries and ten capitals are laid out for everyone, and players
 * take turns placing a single capital. A correct placement locks onto
 * the board and scores; a wrong one costs the placer a life.
 *
 * The pointer handling lives in useBoardDrag, shared with the map
 * board.
 */

type CapitalMatchRoundProps = {
  payload: Extract<AtlasRoundPayload, { type: "capital_match" }>;
  language: "en" | "de";
  placements: AtlasPlacement[];
  players: RoomPlayer[];
  currentPlayerId: string | null;
  localPlayerId: string;
  playerLives: Record<string, number>;
  outPlayerIds: string[];
  startingLives: number;
  onPlace: (countryId: string, capitalCountryId: string) => void;
  /** True while a placement is in flight, or the round is over. */
  disabled: boolean;
  revealed: boolean;
  labels: {
    yourTurn: string;
    waitingFor: string;
    outOfLives: string;
    placedBy: string;
    dragHint: string;
  };
};

function CapitalMatchRound({
  payload,
  language,
  placements,
  players,
  currentPlayerId,
  localPlayerId,
  playerLives,
  outPlayerIds,
  startingLives,
  onPlace,
  disabled,
  revealed,
  labels,
}: CapitalMatchRoundProps) {
  /* The board is derived from the placement log, not local state. */
  const solvedBy = new Map<string, string>();

  for (const placement of placements) {
    if (placement.isCorrect) {
      solvedBy.set(placement.countryId, placement.placedBy);
    }
  }

  const lastWrong = [...placements]
    .reverse()
    .find((placement) => !placement.isCorrect);

  const myTurn = currentPlayerId === localPlayerId;
  const interactive = myTurn && !disabled && !revealed;

  const { selected, poolRef, itemProps, slotProps } = useBoardDrag({
    interactive,
    onDrop: (slotId, itemId) => {
      if (!solvedBy.has(slotId)) {
        onPlace(slotId, itemId);
      }
    },
  });

  const pool = payload.capitalOrder.filter(
    (capitalId) => !solvedBy.has(capitalId),
  );

  const playerName = (playerId: string) =>
    players.find((player) => player.id === playerId)?.name ?? "?";

  const renderChip = (capitalId: string, inSlot: boolean) => {
    const country = getAtlasCountry(capitalId);

    if (!country) {
      return null;
    }

    const item = itemProps(capitalId);

    return (
      <button
        key={capitalId}
        type="button"
        disabled={!interactive}
        className={[
          "atlasCapitalChip",
          item.isDragging ? "dragging" : "",
          item.isSelected ? "selected" : "",
          inSlot ? "inSlot" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={item.style}
        {...item.handlers}
      >
        {capitalName(country, language)}
      </button>
    );
  };

  return (
    <div className="atlasMatchRound">
      <div className={`atlasTurnBanner ${myTurn ? "mine" : ""}`}>
        {revealed
          ? null
          : myTurn
            ? labels.yourTurn
            : `${labels.waitingFor} ${playerName(currentPlayerId ?? "")}`}
      </div>

      <div className="atlasLives">
        {players.map((player) => {
          const isOut = outPlayerIds.includes(player.id);
          const lives = playerLives[player.id] ?? startingLives;

          return (
            <div
              key={player.id}
              className={[
                "atlasLifeRow",
                player.id === currentPlayerId ? "current" : "",
                isOut ? "out" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>{player.name}</span>

              <span className="atlasHearts">
                {Array.from({ length: startingLives }, (_unused, index) => (
                  <Heart
                    key={index}
                    size={13}
                    className={index < lives ? "filled" : ""}
                  />
                ))}
              </span>

              {isOut && <span className="atlasOutTag">{labels.outOfLives}</span>}
            </div>
          );
        })}
      </div>

      {lastWrong && !revealed && (
        <div className="atlasLastWrong">
          <X size={15} />

          {playerName(lastWrong.placedBy)}
          {": "}
          {capitalName(getAtlasCountry(lastWrong.capitalCountryId)!, language)}
          {" → "}
          {countryName(getAtlasCountry(lastWrong.countryId)!, language)}
        </div>
      )}

      <div className="atlasMatchSlots">
        {payload.countryIds.map((countryId) => {
          const country = getAtlasCountry(countryId);

          if (!country) {
            return null;
          }

          const solver = solvedBy.get(countryId);

          const slot = slotProps(countryId);

          return (
            <div
              key={countryId}
              data-slot={interactive && !solver ? countryId : undefined}
              className={[
                "atlasMatchSlot",
                solver ? "correct" : "",
                interactive && !solver && selected ? "droppable" : "",
                slot.isOver && !solver ? "over" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={slot.onClick}
            >
              <span className="atlasMatchFlag">
                {country.flag && <Flag spec={country.flag} />}
              </span>

              <span className="atlasMatchCountry">
                {countryName(country, language)}
              </span>

              <span className="atlasMatchDrop">
                {solver ? (
                  <span className="atlasCapitalChip solved">
                    <Check size={14} />

                    {capitalName(country, language)}
                  </span>
                ) : revealed ? (
                  <span className="atlasMatchTruth">
                    {capitalName(country, language)}
                  </span>
                ) : (
                  <span className="atlasMatchEmpty" />
                )}
              </span>

              {solver && (
                <span className="atlasMatchPlacer">
                  {labels.placedBy} {playerName(solver)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!revealed && interactive && pool.length > 0 && (
        <p className="atlasDragHint">{labels.dragHint}</p>
      )}

      {!revealed && pool.length > 0 && (
        <div
          ref={poolRef}
          className={`atlasMatchPool ${interactive ? "active" : ""}`}
        >
          {pool.map((capitalId) => renderChip(capitalId, false))}
        </div>
      )}
    </div>
  );
}

export default CapitalMatchRound;
