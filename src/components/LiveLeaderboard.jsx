import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Nasza funkcja wyliczająca umieszczona poza komponentem
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

  // KROK 1: Inicjalizacja danych (Mecze, Typy, Baza punktów)
  useEffect(() => {
    const fetchInitialData = async () => {
      // Pobieramy trwające mecze
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'live');
      
      if (matches) setLiveMatches(matches);

      // Pobieramy typy (Tylko dla meczów, które trwają)
      if (matches && matches.length > 0) {
        const liveMatchIds = matches.map(m => m.id);
        const { data: preds } = await supabase
          .from('predictions')
          .select('*')
          .in('match_id', liveMatchIds);
        if (preds) setPredictions(preds);
      }

      // Pobieramy bazowy ranking (punkty z zakończonych meczów)
      // Wymaga połączenia z tabelą users/profiles, żeby mieć nazwy graczy
      const { data: board } = await supabase
        .from('leaderboard')
        .select('*, profiles(display_name)');
      
      if (board) setBaseLeaderboard(board);
    };

    fetchInitialData();

    // Nasłuchiwanie na gole w czasie rzeczywistym
    const channel = supabase.channel('live-matches')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, (payload) => {
        setLiveMatches(current => current.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // KROK 2: Logika przeliczania rankingu "w locie"
  // Ten useEffect odpali się za każdym razem, gdy wpada nowy gol (czyli zmienia się stan liveMatches)
  useEffect(() => {
    if (baseLeaderboard.length === 0) return;

    // Kopiujemy bazowy ranking
    const newDynamicBoard = baseLeaderboard.map(player => {
      let virtualPoints = 0;

      // Szukamy wszystkich typów tego gracza dla trwających spotkań
      const playerPredictions = predictions.filter(p => p.user_id === player.user_id);

      playerPredictions.forEach(pred => {
        // Znajdujemy aktualny wynik na żywo dla tego typu
        const liveMatch = liveMatches.find(m => m.id === pred.match_id);
        
        if (liveMatch) {
          virtualPoints += calculateVirtualPoints(
            liveMatch.home_score, 
            liveMatch.away_score, 
            pred.home_score_guess, 
            pred.away_score_guess
          );
        }
      });

      // Zwracamy gracza ze zaktualizowaną liczbą punktów
      return {
        ...player,
        currentTotal: player.total_points + virtualPoints, // Twarde punkty + wirtualne
        virtualPointsAdded: virtualPoints // Przydatne, by pokazać w UI zielone "+3" obok wyniku
      };
    });

    // Sortujemy nową tabelę od największej liczby punktów
    newDynamicBoard.sort((a, b) => b.currentTotal - a.currentTotal);
    
    setDynamicLeaderboard(newDynamicBoard);

  }, [liveMatches, predictions, baseLeaderboard]);

  return (
    <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse mr-2"></span>
        Ranking na żywo
      </h2>
      
      <div className="space-y-2">
        {dynamicLeaderboard.map((player, index) => (
          // Zamieniamy <div> na <motion.div layout> i dodajemy klucz (layoutId)
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
              <span className="font-semibold text-gray-700">{player.profiles?.display_name || 'Gracz'}</span>
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