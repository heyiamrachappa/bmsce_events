import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import stringSimilarity from "string-similarity";
import { supabase } from "@/integrations/supabase/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/(?:mr|ms|mrs|dr|prof)\.?\s+/g, "") // Remove titles
    .replace(/[^a-z\s]/g, "") // Remove special chars
    .trim();
}

export function fuzzyMatchName(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  // Direct check for "Rahul Kumar" vs "Rahul K"
  if (n1.includes(n2) || n2.includes(n1)) return 0.9;
  
  return stringSimilarity.compareTwoStrings(n1, n2);
}

export async function verifyTeamPayment(extractedName: string, teamId: string): Promise<{ score: number; matchedName?: string }> {
  // 1. Fetch team members
  const { data: members } = await supabase
    .from('team_members')
    .select('name')
    .eq('team_id', teamId);
    
  // 2. Fetch team leader (from registration_teams)
  const { data: team } = await supabase
    .from('registration_teams')
    .select('leader_user_id')
    .eq('id', teamId)
    .single();
    
  let leaderName = '';
  if (team?.leader_user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', team.leader_user_id)
      .single();
    leaderName = profile?.full_name || '';
  }

  const allNames = [
    leaderName,
    ...(members?.map(m => m.name) || [])
  ].filter(Boolean);

  let bestScore = 0;
  let matchedName = '';

  for (const name of allNames) {
    const score = fuzzyMatchName(extractedName, name);
    if (score > bestScore) {
      bestScore = score;
      matchedName = name;
    }
  }

  return { score: bestScore, matchedName };
}
