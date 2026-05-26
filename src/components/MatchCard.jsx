import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function MatchCard({ match, user }) {
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // NOWY KOD: Pobieranie istniejącego typu z bazy przy załadowaniu strony
  useEffect(() => {
    const fetchExistingPrediction = async () => {
      if (!user || !match) return;

      const { data, error } = await supabase
        .from('predictions')
        .select('home_score_guess, away_score_guess')
        .eq('user_id', user.id)
        .eq('match_id', match.id)
        .maybeSingle(); // maybeSingle nie wyrzuca błędu, gdy gracz jeszcze nie typował

      // Jeśli w bazie jest zapisany typ, uzupełnij inputy
      if (data) {
        setHomeScore(data.home_score_guess);
        setAwayScore(data.away_score_guess);
      }
    };

    fetchExistingPrediction();
  }, [match.id, user.id]); // Ten efekt wykona się za każdym razem, gdy załaduje się mecz

  const handleSave = async () => {
    if (homeScore === '' || awayScore === '') {
      setMessage('Wpisz oba wyniki!');
      return;
    }

    setIsSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('predictions')
      .upsert({
        user_id: user.id,
        match_id: match.id,
        home_score_guess: parseInt(homeScore),
        away_score_guess: parseInt(awayScore)
      }, { onConflict: 'user_id,match_id' });

    setIsSaving(false);

    if (error) {
      console.error("Błąd zapisu:", error);
      setMessage('Błąd zapisu!');
    } else {
      setMessage('Typ zapisany!');
    }
  };

  const matchDate = new Date(match.match_date).toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center transition-all hover:shadow-md">
      <div className="text-xs text-gray-500 mb-3 font-medium bg-gray-100 px-3 py-1 rounded-full">
        {matchDate}
      </div>
      
      <div className="flex items-center justify-between w-full mb-4">
        <span className="font-bold text-gray-800 w-1/3 text-right truncate pr-2">{match.home_team}</span>
        <div className="flex space-x-2 w-1/3 justify-center">
          <input 
            type="number" 
            min="0"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="w-12 h-12 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-2xl font-black text-gray-300 self-center">:</span>
          <input 
            type="number" 
            min="0"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="w-12 h-12 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="font-bold text-gray-800 w-1/3 text-left truncate pl-2">{match.away_team}</span>
      </div>

      <div className="w-full flex flex-col items-center mt-2">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full max-w-xs py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-blue-400"
        >
          {isSaving ? 'Zapisywanie...' : 'Zapisz typ'}
        </button>
        
        {message && (
          <span className={`text-sm mt-2 font-medium ${message.includes('Błąd') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}