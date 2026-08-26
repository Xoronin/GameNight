import { supabase } from "../lib/supabase";
import type { Profile } from "../types/auth";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_games: number;
  total_wins: number;
  created_at: string;
  updated_at: string;
};

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    totalGames: row.total_games,
    totalWins: row.total_wins,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function usernameToEmail(username: string) {
  const normalized = normalizeUsername(username);

  return `${normalized}@gamenight.local`;
}

export async function signUp(
  username: string,
  password: string,
) {
  const cleanedUsername = username.trim();

  if (!cleanedUsername) {
    throw new Error("Please enter a username.");
  }

  if (cleanedUsername.length < 3) {
    throw new Error(
      "Username must be at least 3 characters.",
    );
  }

  if (password.length < 6) {
    throw new Error(
      "Password must be at least 6 characters.",
    );
  }

  const { data: existingProfile, error: lookupError } =
    await supabase
      .from("profiles")
      .select("id")
      .eq("username", cleanedUsername)
      .maybeSingle();

  if (lookupError) {
    throw new Error(
      `Could not check username: ${lookupError.message}`,
    );
  }

  if (existingProfile) {
    throw new Error("This username is already taken.");
  }

  const email = usernameToEmail(cleanedUsername);

  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanedUsername,
          display_name: cleanedUsername,
        },
      },
    });

  if (error) {
    if (
      error.message
        .toLowerCase()
        .includes("already registered")
    ) {
      throw new Error("This username is already taken.");
    }

    throw new Error(error.message);
  }

  return data;
}

export async function signIn(
  username: string,
  password: string,
) {
  const cleanedUsername = username.trim();

  if (!cleanedUsername || !password) {
    throw new Error(
      "Please enter your username and password.",
    );
  }

  const email = usernameToEmail(cleanedUsername);

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    throw new Error(
      "Invalid username or password.",
    );
  }

  return data;
}

export async function signOut() {
  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function getProfile(
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapProfile(data as ProfileRow);
}