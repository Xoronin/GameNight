import { Heart, X } from "lucide-react";
import { countryName, getAtlasCountry } from "../../../data/atlasCountries";
import type { AtlasPlacement, AtlasRoundPayload } from "../../../types/game";
import type { RoomPlayer } from "../../../types/player";
import MapRegionView from "../MapRegion";
import { useBoardDrag } from "../useBoardDrag";

/*
 * The shared turn-based board again, but the slots are shapes on a map:
 * each turn a player drags one country name onto its outline.
 *
 * Same rules as the capital board — a correct placement locks in and
 * scores, a wrong one costs a life — so it reuses the same drag hook
 * and the same placement records.
 */

type MapPlaceRoundProps = {
  payload: Extract<AtlasRoundPayload, { type: "map_place" }>;
  language: "en" | "de";
  placements: AtlasPlacement[];
  players: RoomPlayer[];
  currentPlayerId: string | null;
  localPlayerId: string;
  playerLives: Record<string, number>;
  outPlayerIds: string[];
  startingLives: number;
  onPlace: (countryId: string, placedId: string) => void;
  disabled: boolean;
  revealed: boolean;
  labels: {
    yourTurn: string;
    waitingFor: string;
    outOfLives: string;
    placedBy: string;
    dragHint: string;
    loading: string;
  };
};

function MapPlaceRound({
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
}: MapPlaceRoundProps) {
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

  const pool = payload.placeOrder.filter(
    (countryId) => !solvedBy.has(countryId),
  );

  const playerName = (playerId: string) =>
    players.find((player) => player.id === playerId)?.name ?? "?";

  return (
    <div className="atlasMatchRound atlasMapBoard">
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
          {countryName(getAtlasCountry(lastWrong.capitalCountryId)!, language)}
          {" → "}
          {countryName(getAtlasCountry(lastWrong.countryId)!, language)}
        </div>
      )}

      <MapRegionView
        region={payload.region}
        targetIds={payload.countryIds}
        solvedIds={[...solvedBy.keys()]}
        selectedId={selected}
        droppable={interactive}
        onShapeClick={(countryId) => slotProps(countryId).onClick()}
        loadingLabel={labels.loading}
      />

      {revealed && (
        <div className="atlasMapLegend">
          {payload.countryIds.map((countryId) => {
            const country = getAtlasCountry(countryId);
            const solver = solvedBy.get(countryId);

            return country ? (
              <span
                key={countryId}
                className={`atlasMapLegendItem ${solver ? "solved" : ""}`}
              >
                {countryName(country, language)}
                {solver && ` · ${labels.placedBy} ${playerName(solver)}`}
              </span>
            ) : null;
          })}
        </div>
      )}

      {!revealed && interactive && pool.length > 0 && (
        <p className="atlasDragHint">{labels.dragHint}</p>
      )}

      {!revealed && pool.length > 0 && (
        <div
          ref={poolRef}
          className={`atlasMatchPool ${interactive ? "active" : ""}`}
        >
          {pool.map((countryId) => {
            const country = getAtlasCountry(countryId);

            if (!country) {
              return null;
            }

            const item = itemProps(countryId);

            return (
              <button
                key={countryId}
                type="button"
                disabled={!interactive}
                className={[
                  "atlasCapitalChip",
                  item.isDragging ? "dragging" : "",
                  item.isSelected ? "selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={item.style}
                {...item.handlers}
              >
                {countryName(country, language)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MapPlaceRound;
