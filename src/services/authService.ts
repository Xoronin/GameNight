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

export async function signUp(
  email: string,
  password: string,
  username: string,
) {
  const cleanedEmail = email.trim();
  const cleanedUsername = username.trim();

  const { data, error } = await supabase.auth.signUp({
    email: cleanedEmail,
    password,
    options: {
      data: {
        username: cleanedUsername,
        display_name: cleanedUsername,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signIn(
  email: string,
  password: string,
) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

  if (error) {
    throw new Error(error.message);
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