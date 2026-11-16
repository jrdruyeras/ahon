import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fcvckktgljllyrjyizfr.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_iL-BQGqZzQd74A39JtltNA_JPCVBzt6'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export function getAnonymousVoterId() {
  let id = localStorage.getItem('ahon_voter_id');
  if (!id) {
    id = 'voter_' + Math.random().toString(36).substring(2) + Date.now();
    localStorage.setItem('ahon_voter_id', id);
  }
  return id;
}

// Track page visit session globally or increment locally per session
export async function recordVisitorPageView() {
  try {
    const sessionKey = 'ahon_visited_session';
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, 'true');
      // Optional: Log a visit or increment a lightweight global counter if desired
    }
  } catch (e) {
    console.error("Visit tracking error:", e);
  }
}

// Fetch all matchups and aggregated votes from Supabase votes table
export async function fetchMatchupsAndVotes() {
  try {
    const { data: votesData, error } = await supabase.from('votes').select('*');
    if (error) throw error;

    const votesMap = {};
    if (votesData && votesData.length > 0) {
      votesData.forEach(v => {
        const mId = String(v.matchup_id);
        const bName = v.selected_battler || v.battler_name;
        if (mId && bName) {
          if (!votesMap[mId]) votesMap[mId] = {};
          votesMap[mId][bName] = (votesMap[mId][bName] || 0) + 1;
        }
      });
    }
    return votesMap;
  } catch (err) {
    console.error("Error fetching votes from Supabase:", err);
    return {};
  }
}

// Cast or update a vote cleanly
export async function castVote(matchupId, battlerName) {
  const voterUuid = getAnonymousVoterId();
  try {
    // Delete existing vote for this matchup by this voter
    await supabase
      .from('votes')
      .delete()
      .eq('matchup_id', matchupId)
      .eq('voter_uuid', voterUuid);

    // Insert new vote
    const { error } = await supabase
      .from('votes')
      .insert([{ matchup_id: matchupId, voter_uuid: voterUuid, selected_battler: battlerName }]);

    if (error) {
      console.error("Supabase vote insert error:", error.message);
    } else {
      console.log("Vote recorded successfully for matchup:", matchupId);
    }
  } catch (e) {
    console.log("Vote error:", e.message);
  }
}

// Fetch global stats dynamically from Supabase database rows
export async function fetchGlobalStats() {
  try {
    // 1. Get total votes count
    const { count: totalVotes, error: votesError } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true });

    if (votesError) throw votesError;

    // 2. Get unique participants (unique voter UUIDs) from votes table
    const { data: uniqueData, error: uniqueError } = await supabase
      .from('votes')
      .select('voter_uuid');

    let uniqueCount = 0;
    if (!uniqueError && uniqueData) {
      const uniqueUuids = new Set(uniqueData.map(row => row.voter_uuid));
      uniqueCount = uniqueUuids.size;
    }

    // 3. Estimate global visits based on votes + unique interaction baseline
    const totalVisits = Math.max(totalVotes || 0, uniqueCount * 2, 1);

    return {
      totalVisits: totalVisits,
      uniqueVisitors: uniqueCount,
      totalVotes: totalVotes || 0
    };
  } catch (e) {
    console.error("Error fetching global stats:", e);
    return { totalVisits: 0, uniqueVisitors: 0, totalVotes: 0 };
  }
}