import type { Player } from "../types/player";

const PLAYER_KEY = "game-night-player";

export function createPlayer(name: string, isHost: boolean): Player {
    return {
        id: crypto.randomUUID(),
        name: name.trim(),
        isHost,
    };
}

export function savePlayer(player: Player) {
    localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
}

export function getPlayer(): Player | null {
    const stored = localStorage.getItem(PLAYER_KEY);

    if (!stored) {
        return null;
    }

    try {
        return JSON.parse(stored) as Player;
    } catch {
        return null;
    }
}

export function clearPlayer() {
    localStorage.removeItem(PLAYER_KEY);
}

export function createRoomCode(length = 4) {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let result = "";

    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * characters.length),
        );
    }

    return result;
}