import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { supabase, fetchMatchupsAndVotes, castVote, fetchGlobalStats } from './votingService';

// Official FlipTop AHON 17 Lineup (Bottom-Up Order from Poster)
const MATCHUPS_DATA = [
  // --- DAY 1 (Left Column: Bottom to Top) ---
  { 
    id: 'd1_royal_rumble', 
    day: 'Day 1', 
    title: 'Royal Rumble / Multi-Battler', 
    battlers: ['Batang Rebelde', 'Marshall Bonifacio', 'Bisente', 'Tulala', 'Jabo'] 
  },
  { id: 'd1_m1', day: 'Day 1', title: 'Vitrum vs. Empithri', battlers: ['Vitrum', 'Empithri'] },
  { id: 'd1_m2', day: 'Day 1', title: 'Pistolero vs. Ban', battlers: ['Pistolero', 'Ban'] },
  { id: 'd1_m3', day: 'Day 1', title: 'Lhipkram vs. Zend Luke', battlers: ['Lhipkram', 'Zend Luke'] },
  { id: 'd1_m4', day: 'Day 1', title: 'Sak Maestro vs. Saint Ice', battlers: ['Sak Maestro', 'Saint Ice'] },
  { id: 'd1_m5', day: 'Day 1', title: 'Hazky vs. Manda Baliw', battlers: ['Hazky', 'Manda Baliw'] },
  { id: 'd1_m6', day: 'Day 1', title: 'Zaito vs. Jonas', battlers: ['Zaito', 'Jonas'] },
  { id: 'd1_m7', day: 'Day 1', title: 'Katana vs. Cripli', battlers: ['Katana', 'Cripli'] },
  { id: 'd1_m8', day: 'Day 1', title: 'GL vs. Shernan', battlers: ['GL', 'Shernan'] },

  // --- DAY 2 (Right Column: Bottom to Top) ---
  { id: 'd2_m1', day: 'Day 2', title: 'Article Clipted vs. Dave Denver', battlers: ['Article Clipted', 'Dave Denver'] },
  { id: 'd2_m2', day: 'Day 2', title: 'K-Ram vs. 3rdy', battlers: ['K-Ram', '3rdy'] },
  { id: 'd2_m3', day: 'Day 2', title: 'Slockone vs. Yuniko', battlers: ['Slockone', 'Yuniko'] },
  { id: 'd2_m4', day: 'Day 2', title: 'Surhenyo vs. Mastafeat', battlers: ['Surhenyo', 'Mastafeat'] },
  { id: 'd2_m5', day: 'Day 2', title: 'Butzen vs. Steven', battlers: ['Butzen', 'Steven'] },
  { id: 'd2_m6', day: 'Day 2', title: 'Sayadd vs. Zaki', battlers: ['Sayadd', 'Zaki'] },
  { id: 'd2_m7', day: 'Day 2', title: 'Mzhayt vs. Diddle', battlers: ['Mzhayt', 'Diddle'] },
  { id: 'd2_m8', day: 'Day 2', title: 'Poison13 vs. Keelan', battlers: ['Poison13', 'Keelan'] },
  { id: 'd2_m9', day: 'Day 2', title: 'Loonie vs. Mhot', battlers: ['Loonie', 'Mhot'] }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('vote'); // 'vote', 'leaderboard', 'share', 'admin'
  const [votesMap, setVotesMap] = useState({});
  const [userPredictions, setUserPredictions] = useState({});
  const [globalStats, setGlobalStats] = useState({ totalVisits: 1420, uniqueVisitors: 980, totalVotes: 0 });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isVotingClosed, setIsVotingClosed] = useState(false);

  // Countdown Timer State
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const cardRef = useRef(null);

  // Load votes and stats on mount + Setup Countdown Timer
  useEffect(() => {
    loadData();

    const targetDate = new Date('December 19, 2026 00:00:00').getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const fetchedVotes = await fetchMatchupsAndVotes();
    setVotesMap(fetchedVotes || {});
    const stats = await fetchGlobalStats();
    setGlobalStats(stats);
  };

  // Handle Voting
  const handleVote = async (matchupId, battlerName) => {
    if (isVotingClosed) {
      alert("Voting is currently closed by the admin.");
      return;
    }

    setUserPredictions(prev => ({ ...prev, [matchupId]: battlerName }));
    await castVote(matchupId, battlerName);
    loadData();
  };

  // 1. Download Card Image
  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: cardRef.current.scrollWidth,
        windowHeight: cardRef.current.scrollHeight
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = 'FlipTop-AHON17-Predictions.png';
      link.click();
    } catch (err) {
      console.error("Error generating prediction card image:", err);
    }
  };

  // 2. Copy Prediction Link
  const handleCopyLink = () => {
    const shareUrl = window.location.href.split('?')[0];
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Prediction link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy link: ', err);
    });
  };

  // 3. Share on Facebook
  const handleShareFacebook = () => {
    const shareUrl = encodeURIComponent(window.location.href.split('?')[0]);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank');
  };

  // 4. Share on Messenger
  const handleShareMessenger = () => {
    const shareUrl = encodeURIComponent(window.location.href.split('?')[0]);
    window.open(`https://www.facebook.com/dialog/send?link=${shareUrl}&app_id=123456789&redirect_uri=${shareUrl}`, '_blank');
  };

  // Calculate vote percentages for a matchup & battler
  const getStats = (matchupId, battler) => {
    const matchupVotes = votesMap[matchupId] || {};
    const totalMatchupVotes = Object.values(matchupVotes).reduce((a, b) => a + b, 0);
    const battlerVotes = matchupVotes[battler] || 0;
    const percentage = totalMatchupVotes > 0 ? Math.round((battlerVotes / totalMatchupVotes) * 100) : 0;
    return { votes: battlerVotes, total: totalMatchupVotes, percentage };
  };

  // Helper to find leader of a matchup
  const getLeadingBattler = (matchup) => {
    const matchupVotes = votesMap[matchup.id] || {};
    let leader = 'No votes yet';
    let maxVotes = -1;
    matchup.battlers.forEach(b => {
      const v = matchupVotes[b] || 0;
      if (v > maxVotes) {
        maxVotes = v;
        leader = b;
      }
    });
    return maxVotes > 0 ? `${leader} (${maxVotes} votes)` : 'Tied / No Votes';
  };

  // Calculate Closest Battles & Most Popular Battlers across all votes
  const getAllBattlerStats = () => {
    const allBattlers = [];
    MATCHUPS_DATA.forEach(matchup => {
      matchup.battlers.forEach(battler => {
        const stats = getStats(matchup.id, battler);
        allBattlers.push({ name: battler, matchupTitle: matchup.title, ...stats });
      });
    });
    return allBattlers;
  };

  const allBattlerStats = getAllBattlerStats();
  const mostPopularBattlers = [...allBattlerStats].sort((a, b) => b.votes - a.votes).slice(0, 3);

  const getClosestBattles = (dayFilter) => {
    return MATCHUPS_DATA.filter(m => !dayFilter || m.day === dayFilter).map(matchup => {
      const matchupVotes = votesMap[matchup.id] || {};
      const counts = matchup.battlers.map(b => matchupVotes[b] || 0).sort((a, b) => b - a);
      const diff = counts.length > 1 ? counts[0] - counts[1] : counts[0];
      const total = counts.reduce((a, b) => a + b, 0);
      return { ...matchup, diff, total };
    }).filter(m => m.total > 0).sort((a, b) => a.diff - b.diff).slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans">
      {/* Header Navigation */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-black tracking-wider text-orange-500">FLIPTOP AHON 17</span>
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30">FAN VOTING</span>
          </div>
          <nav className="flex space-x-2 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button 
              onClick={() => setActiveTab('vote')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition cursor-pointer ${activeTab === 'vote' ? 'bg-orange-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Matchups & Vote
            </button>
            <button 
              onClick={() => setActiveTab('leaderboard')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition cursor-pointer ${activeTab === 'leaderboard' ? 'bg-orange-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Live Leaderboard
            </button>
            <button 
              onClick={() => setActiveTab('share')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition cursor-pointer ${activeTab === 'share' ? 'bg-orange-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Share Predictions
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition cursor-pointer ${activeTab === 'admin' ? 'bg-orange-500 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Admin
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* TAB 1: VOTE */}
        {activeTab === 'vote' && (
          <div>
            {/* Homepage Statistics & Live Countdown Timer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              
              {/* Homepage Statistics */}
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg flex flex-col justify-between">
                <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-4">Event Analytics</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                    <p className="text-xs text-gray-400 uppercase">Visits</p>
                    <p className="text-xl font-black text-orange-500">{globalStats.totalVisits}</p>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                    <p className="text-xs text-gray-400 uppercase">Unique</p>
                    <p className="text-xl font-black text-orange-500">{globalStats.uniqueVisitors}</p>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                    <p className="text-xs text-gray-400 uppercase">Votes</p>
                    <p className="text-xl font-black text-orange-500">{globalStats.totalVotes}</p>
                  </div>
                </div>
              </div>

              {/* Live Countdown Timer */}
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg flex flex-col justify-between">
                <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-2">Countdown to AHON 17 (Dec 19, 2026)</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                    <span className="text-xl font-black text-white">{timeLeft.days}</span>
                    <p className="text-[10px] text-gray-400 uppercase">Days</p>
                  </div>
                  <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                    <span className="text-xl font-black text-white">{timeLeft.hours}</span>
                    <p className="text-[10px] text-gray-400 uppercase">Hours</p>
                  </div>
                  <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                    <span className="text-xl font-black text-white">{timeLeft.minutes}</span>
                    <p className="text-[10px] text-gray-400 uppercase">Mins</p>
                  </div>
                  <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                    <span className="text-xl font-black text-white">{timeLeft.seconds}</span>
                    <p className="text-[10px] text-gray-400 uppercase">Secs</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="mb-8 text-center">
              <h1 className="text-3xl font-extrabold text-orange-500 mb-2">OFFICIAL FAN BALLOT</h1>
              <p className="text-gray-400">December 19-20, 2026 • Cast your independent predictions below. Click any battler to vote or change your pick.</p>
            </div>

            <div className="space-y-8">
              {MATCHUPS_DATA.map((matchup) => (
                <div key={matchup.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-4 border-b border-neutral-800 pb-2">
                    <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">{matchup.day}</span>
                    <h3 className="text-lg font-bold">{matchup.title}</h3>
                  </div>

                  <div className={`grid gap-4 ${matchup.battlers.length > 2 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2'}`}>
                    {matchup.battlers.map((battler) => {
                      const isSelected = userPredictions[matchup.id] === battler;
                      const stats = getStats(matchup.id, battler);

                      return (
                        <div 
                          key={battler}
                          onClick={() => handleVote(matchup.id, battler)}
                          className={`cursor-pointer border rounded-lg p-4 flex flex-col justify-between transition relative overflow-hidden ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10' 
                              : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-sm sm:text-base">{battler}</span>
                              {isSelected && <span className="text-xs bg-orange-500 text-black font-extrabold px-1.5 py-0.5 rounded">PICKED</span>}
                            </div>
                            <p className="text-xs text-gray-400">{stats.percentage}% ({stats.votes} votes)</p>
                          </div>
                          
                          <button className={`mt-4 w-full py-2 text-xs font-bold rounded transition cursor-pointer ${
                            isSelected ? 'bg-orange-500 text-black' : 'bg-neutral-800 text-white hover:bg-neutral-700'
                          }`}>
                            {isSelected ? 'SELECTED ✓' : 'VOTE'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-orange-500 mb-2">LIVE LEADERBOARD</h1>
              <p className="text-gray-400">Real-time database statistics, leading contenders, and closest matchups.</p>
            </div>

            {/* Highlights Section: Most Popular & Closest Battles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              
              {/* Most Popular Battlers */}
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-orange-400 mb-4">🔥 Most Popular Battlers</h3>
                <div className="space-y-3">
                  {mostPopularBattlers.map((b, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-neutral-950 p-3 rounded border border-neutral-800 text-sm">
                      <div>
                        <span className="font-bold text-white">{idx + 1}. {b.name}</span>
                        <p className="text-xs text-gray-400">{b.matchupTitle}</p>
                      </div>
                      <span className="text-orange-400 font-black">{b.votes} votes</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Closest Battles Overall */}
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-orange-400 mb-4">⚡ Closest Battles</h3>
                <div className="space-y-3">
                  {getClosestBattles().map((m, idx) => (
                    <div key={idx} className="bg-neutral-950 p-3 rounded border border-neutral-800 text-sm">
                      <span className="font-bold text-white">{m.title}</span>
                      <p className="text-xs text-orange-300 mt-1">Leading: {getLeadingBattler(m)}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Day 1 Leaderboard Section */}
            <div className="mb-12">
              <h2 className="text-2xl font-black text-orange-500 mb-6 border-b border-neutral-800 pb-2">DAY 1 LEADERBOARD</h2>
              <div className="space-y-6">
                {MATCHUPS_DATA.filter(m => m.day === 'Day 1').map((matchup) => {
                  const matchupVotes = votesMap[matchup.id] || {};
                  const totalVotes = Object.values(matchupVotes).reduce((a, b) => a + b, 0);

                  return (
                    <div key={matchup.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold">{matchup.title}</h3>
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded font-bold">
                          Leader: {getLeadingBattler(matchup)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-4">Total Votes Recorded: <strong className="text-white">{totalVotes}</strong></p>
                      
                      <div className="space-y-3">
                        {matchup.battlers.map(battler => {
                          const stats = getStats(matchup.id, battler);
                          return (
                            <div key={battler} className="bg-neutral-950 p-3 rounded border border-neutral-800">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-semibold">{battler}</span>
                                <span className="text-orange-400 font-bold">{stats.percentage}% ({stats.votes} votes)</span>
                              </div>
                              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${stats.percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day 2 Leaderboard Section */}
            <div>
              <h2 className="text-2xl font-black text-orange-500 mb-6 border-b border-neutral-800 pb-2">DAY 2 LEADERBOARD</h2>
              <div className="space-y-6">
                {MATCHUPS_DATA.filter(m => m.day === 'Day 2').map((matchup) => {
                  const matchupVotes = votesMap[matchup.id] || {};
                  const totalVotes = Object.values(matchupVotes).reduce((a, b) => a + b, 0);

                  return (
                    <div key={matchup.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold">{matchup.title}</h3>
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded font-bold">
                          Leader: {getLeadingBattler(matchup)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-4">Total Votes Recorded: <strong className="text-white">{totalVotes}</strong></p>
                      
                      <div className="space-y-3">
                        {matchup.battlers.map(battler => {
                          const stats = getStats(matchup.id, battler);
                          return (
                            <div key={battler} className="bg-neutral-950 p-3 rounded border border-neutral-800">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-semibold">{battler}</span>
                                <span className="text-orange-400 font-bold">{stats.percentage}% ({stats.votes} votes)</span>
                              </div>
                              <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${stats.percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: SHARE PREDICTIONS */}
        {activeTab === 'share' && (
          <div className="max-w-2xl mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-2xl font-extrabold text-orange-500 mb-2">SHARE YOUR PREDICTIONS</h2>
            <p className="text-gray-400 mb-6 text-sm">Flex your official AHON 17 fan ballot and challenge your friends!</p>

            {/* Shareable Card Ref Container */}
            <div 
              ref={cardRef} 
              className="bg-neutral-950 border border-orange-500/40 rounded-xl p-6 mb-6 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-black text-orange-500">FLIPTOP AHON 17 BALLOT</h3>
                  <p className="text-xs text-gray-400">December 19-20, 2026 • Fan Prediction Card</p>
                </div>
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded font-bold">OFFICIAL</span>
              </div>

              <div className="space-y-3">
                {MATCHUPS_DATA.map((matchup) => (
                  <div key={matchup.id} className="flex justify-between items-center bg-neutral-900 p-3 rounded border border-neutral-800 text-sm">
                    <span className="text-gray-300 font-medium">{matchup.title}</span>
                    <span className="text-orange-400 font-bold">
                      {userPredictions[matchup.id] ? userPredictions[matchup.id] : 'No Pick'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={handleDownloadCard}
                className="bg-orange-500 hover:bg-orange-600 text-black font-bold py-3 px-4 rounded-lg transition shadow-lg cursor-pointer"
              >
                📥 Download Prediction Card
              </button>
              <button 
                onClick={handleCopyLink}
                className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-4 rounded-lg transition border border-neutral-700 cursor-pointer"
              >
                🔗 Copy Prediction Link
              </button>
              <button 
                onClick={handleShareFacebook}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition cursor-pointer"
              >
                Share on Facebook
              </button>
              <button 
                onClick={handleShareMessenger}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition cursor-pointer"
              >
                Share on Messenger
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: ADMIN */}
        {activeTab === 'admin' && (
          <div className="max-w-md mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-orange-500 mb-4">ADMIN PORTAL</h2>
            
            {!isAdminAuthenticated ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Enter administrator password to manage voting status.</p>
                <input 
                  type="password" 
                  placeholder="Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded-lg text-white"
                />
                <button 
                  onClick={() => {
                    if (adminPassword === 'ahon17admin') {
                      setIsAdminAuthenticated(true);
                    } else {
                      alert('Incorrect password! (Hint: ahon17admin)');
                    }
                  }}
                  className="w-full bg-orange-500 text-black font-bold py-3 rounded-lg hover:bg-orange-600 transition cursor-pointer"
                >
                  Log In
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Global Voting Status</p>
                    <p className="text-xs text-gray-400">{isVotingClosed ? 'Voting is closed for fans.' : 'Voting is active.'}</p>
                  </div>
                  <button 
                    onClick={() => setIsVotingClosed(!isVotingClosed)}
                    className={`px-4 py-2 text-xs font-bold rounded cursor-pointer ${isVotingClosed ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
                  >
                    {isVotingClosed ? 'CLOSED' : 'OPEN'}
                  </button>
                </div>
                <button 
                  onClick={() => setIsAdminAuthenticated(false)}
                  className="w-full bg-neutral-800 text-white font-bold py-2 rounded-lg hover:bg-neutral-700 transition text-sm cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}