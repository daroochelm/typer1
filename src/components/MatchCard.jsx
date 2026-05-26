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

  // Dodajemy flagę sprawdzającą, czy mecz się już rozpoczął
  const isLive = match.status === 'live';

  return (
    <div className={`bg-white p-5 rounded-xl shadow-sm border flex flex-col items-center transition-all ${isLive ? 'border-red-300 bg-red-50' : 'border-gray-100 hover:shadow-md'}`}>
      
      {/* Dynamiczny nagłówek daty / statusu */}
      <div className={`text-xs mb-3 font-medium px-3 py-1 rounded-full ${isLive ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
        {isLive ? 'MECZ TRWA - TYPY ZABLOKOWANE' : matchDate}
      </div>
      
      <div className="flex items-center justify-between w-full mb-4">
        <span className="font-bold text-gray-800 w-1/3 text-right truncate pr-2">{match.home_team}</span>
        <div className="flex space-x-2 w-1/3 justify-center">
          <input 
            type="number" 
            min="0"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            disabled={isLive} // Blokada inputu
            className="w-12 h-12 text-center text-xl font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:text-gray-500"
          />
          <span className="text-2xl font-black text-gray-300 self-center">:</span>
          <input 
            type="number" 
            min="0"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            disabled={isLive} // Blokada inputu
            className="w-12 h-12 text-center text-xl font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:text-gray-500"
          />
        </div>
        <span className="font-bold text-gray-800 w-1/3 text-left truncate pl-2">{match.away_team}</span>
      </div>

      <div className="w-full flex flex-col items-center mt-2">
        {/* Ukrywamy przycisk zapisu dla trwających spotkań */}
        {!isLive && (
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full max-w-xs py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-blue-400"
          >
            {isSaving ? 'Zapisywanie...' : 'Zapisz typ'}
          </button>
        )}
        
        {message && !isLive && (
          <span className={`text-sm mt-2 font-medium ${message.includes('Błąd') ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}