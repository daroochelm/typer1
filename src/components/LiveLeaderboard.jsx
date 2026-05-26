import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';

const calculateVirtualPoints = (realHome, realAway, guessHome, guessAway) => {
  if (realHome === null || realAway === null) return 0;
  if (realHome === guessHome && realAway === guessAway) return 3;
  if (realHome > realAway && guessHome > guessAway) return 1;
  if (realHome < realAway && guessHome < guessAway) return 1;
  if (realHome === realAway && guessHome === guessAway) return 1;
  return 0;
};

export default function LiveLeaderboard() {
  const [liveMatches, setLiveMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [baseLeaderboard, setBaseLeaderboard] = useState([]);
  const [dynamicLeaderboard, setDynamicLeaderboard] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'live');
      
      if (matches) setLiveMatches(matches);

      if (matches && matches.length > 0) {
        const liveMatchIds = matches.map(m => m.id);
        const { data: preds } = await supabase
          .from('predictions')
          .select('*')
          .in('match_id', liveMatchIds);
        if (preds) setPredictions(preds);
      }

      // POPRAWKA: Pytamy prosto o nasz nowy widok SQL!
      const { data: board } = await supabase
        .from('leaderboard')
        .select('*');
      
      if (board) setBaseLeaderboard(board);
    };

    fetchInitialData();

    const channel = supabase.channel('live-matches')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, (payload) => {
        setLiveMatches(current => current.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    // Jeśli nie ma graczy w bazie, nie robimy nic
    if (baseLeaderboard.length === 0) return;

    const newDynamicBoard = baseLeaderboard.map(player => {
      let virtualPoints = 0;
      const playerPredictions = predictions.filter(p => p.user_id === player.user_id);

      playerPredictions.forEach(pred => {
        const liveMatch = liveMatches.find(m => m.id === pred.match_id);
        if (liveMatch) {
          virtualPoints += calculateVirtualPoints(
            liveMatch.home_score, liveMatch.away_score, 
            pred.home_score_guess, pred.away_score_guess
          );
        }
      });

      return {
        ...player,
        currentTotal: player.total_points + virtualPoints,
        virtualPointsAdded: virtualPoints
      };
    });

    newDynamicBoard.sort((a, b) => b.currentTotal - a.currentTotal);
    setDynamicLeaderboard(newDynamicBoard);

  }, [liveMatches, predictions, baseLeaderboard]);

  // Jeśli nie ma danych o rankingu, nie wyświetlamy komponentu
  if (dynamicLeaderboard.length === 0) return null;

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-6">
      
      {/* SEKCJA 1: WYNIKI NA ŻYWO */}
      <div className="mb-6 pb-6 border-b border-gray-100">
        <h2 className="text-xl font-bold mb-4 text-red-600 flex items-center">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse mr-2"></span>
          Trwające mecze
        </h2>
        
        <div className="space-y-3">
          {liveMatches.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Obecnie nie toczą się żadne spotkania.</p>
          ) : (
            liveMatches.map((match) => (
              <div key={match.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                <span className="font-semibold text-gray-800 w-1/3 text-right text-lg">{match.home_team}</span>
                <div className="w-1/3 flex justify-center text-3xl font-black text-red-600 tracking-widest">
                  {match.home_score ?? 0} : {match.away_score ?? 0}
                </div>
                <span className="font-semibold text-gray-800 w-1/3 text-left text-lg">{match.away_team}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SEKCJA 2: RANKING TYPERÓW */}
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
        Ranking Typerów
      </h2>
      
      <div className="space-y-2">
        {dynamicLeaderboard.map((player, index) => (
          <motion.div 
            key={player.user_id} 
            layout 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100"
          >
            <div className="flex items-center space-x-4">
              <span className="font-black text-gray-400 w-6 text-right">{index + 1}.</span>
              <span className="font-semibold text-gray-700">{player.display_name || 'Nieznany Gracz'}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              {player.virtualPointsAdded > 0 && (
                <span className="text-xs font-bold text-green-500 bg-green-100 px-2 py-1 rounded-full animate-pulse">
                  +{player.virtualPointsAdded} live
                </span>
              )}
              <span className="font-black text-xl text-blue-600">{player.currentTotal} pkt</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}