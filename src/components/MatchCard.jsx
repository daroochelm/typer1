import { useState, useEffect } from 'react';
// Załóżmy, że masz już skonfigurowanego klienta Supabase
import { supabase } from '../supabaseClient'; 

export default function MatchCard({ match, user, existingPrediction = null }) {
  // Stan przechowujący wpisywane wyniki
  const [homeScore, setHomeScore] = useState(existingPrediction?.home_score_guess ?? '');
  const [awayScore, setAwayScore] = useState(existingPrediction?.away_score_guess ?? '');
  
  // Stan interfejsu
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Sprawdzamy, czy można jeszcze typować (mecz w przyszłości)
  const isMatchLocked = new Date(match.match_date) <= new Date() || match.status !== 'scheduled';

  const handleSavePrediction = async () => {
    if (homeScore === '' || awayScore === '') {
      setSaveMessage('Wpisz kompletny wynik');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    // Operacja UPSERT - doda nowy typ lub zaktualizuje istniejący
    const { error } = await supabase
      .from('predictions')
      .upsert({
        user_id: user.id,
        match_id: match.id,
        home_score_guess: parseInt(homeScore, 10),
        away_score_guess: parseInt(awayScore, 10)
      }, { onConflict: 'user_id, match_id' }); // Wymaga tej unikalnej kombinacji z naszej bazy

    if (error) {
      console.error('Błąd zapisu:', error);
      setSaveMessage('Błąd zapisu. Spróbuj ponownie.');
    } else {
      setSaveMessage('Typ zapisany!');
    }
    
    setIsSaving(false);
    
    // Znikający komunikat o sukcesie
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
        <span>{new Date(match.match_date).toLocaleDateString('pl-PL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        {isMatchLocked && <span className="text-red-500 font-medium">Typowanie zamknięte</span>}
      </div>

      <div className="flex justify-between items-center mb-6">
        {/* Gospodarze */}
        <div className="flex flex-col items-center w-1/3">
          <div className="w-12 h-12 bg-gray-100 rounded-full mb-2 flex items-center justify-center text-xs">Logo</div>
          <span className="font-semibold text-center text-gray-800">{match.home_team}</span>
        </div>

        {/* Sekcja inputów na wynik */}
        <div className="flex items-center space-x-3 w-1/3 justify-center">
          <input
            type="number"
            min="0"
            max="20"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            disabled={isMatchLocked}
            className="w-12 h-12 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
          />
          <span className="font-bold text-gray-400">:</span>
          <input
            type="number"
            min="0"
            max="20"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            disabled={isMatchLocked}
            className="w-12 h-12 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Goście */}
        <div className="flex flex-col items-center w-1/3">
          <div className="w-12 h-12 bg-gray-100 rounded-full mb-2 flex items-center justify-center text-xs">Logo</div>
          <span className="font-semibold text-center text-gray-800">{match.away_team}</span>
        </div>
      </div>

      {/* Przycisk akcji i komunikaty */}
      <div className="flex flex-col items-center">
        {!isMatchLocked && (
          <button
            onClick={handleSavePrediction}
            disabled={isSaving}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors disabled:bg-blue-400"
          >
            {isSaving ? 'Zapisywanie...' : 'Zapisz typ'}
          </button>
        )}
        
        {saveMessage && (
          <span className={`mt-2 text-sm ${saveMessage.includes('Błąd') ? 'text-red-500' : 'text-green-600'}`}>
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
}