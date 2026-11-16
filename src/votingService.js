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

export async function recordVisitorPageView() {
  return true;
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

export async function fetchGlobalStats() {
  try {
    // Fetch total votes count from Supabase
    const { count: totalVotes, error: votesError } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true });

    if (votesError) throw votesError;

    // Optional: If you want website visits and unique visitors to start at 0 
    // and increment live, or track them cleanly:
    let visits = parseInt(localStorage.getItem('ahon_total_visits') || '0') + 1;
    localStorage.setItem('ahon_total_visits', visits);

    return {
      totalVisits: visits,
      uniqueVisitors: visits, // or tracked unique sessions
      totalVotes: totalVotes || 0
    };
  } catch (e) {
    console.error("Error fetching global stats:", e);
    return { totalVisits: 1, uniqueVisitors: 1, totalVotes: 0 };
  }
}