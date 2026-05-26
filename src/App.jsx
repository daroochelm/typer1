import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import MatchCard from './components/MatchCard';
import LiveLeaderboard from './components/LiveLeaderboard';
import Auth from './components/Auth';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 1. Sprawdź obecną sesję przy uruchomieniu aplikacji
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Nasłuchuj zmian stanu autoryzacji (Zalogowanie / Wylogowanie)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Funkcja pomocnicza do wylogowania
  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  // Jeśli brak sesji, wyświetlamy tylko ekran logowania
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-10 px-4">
        <h1 className="text-4xl font-black text-gray-800 tracking-tight text-center">
          Mundial <span className="text-blue-600">2026</span> Typer
        </h1>
        <Auth />
      </div>
    );
  }

  // Dane testowego meczu
  const testMatch = {
    id: 1,
    home_team: 'Polska',
    away_team: 'Argentyna',
    match_date: '2026-06-15T17:00:00Z',
    status: 'scheduled'
  };

  // Użytkownik jest zalogowany – renderujemy całą aplikację
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">
          Mundial <span className="text-blue-600">2026</span> Typer
        </h1>
        <button
          onClick={handleSignOut}
          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-600 px-3 py-1.5 rounded font-medium transition-colors"
        >
          Wyloguj się
        </button>
      </div>
      
      {/* Przekazujemy prawdziwego zalogowanego użytkownika z sesji */}
      <MatchCard match={testMatch} user={session.user} />
      
      <LiveLeaderboard />
    </div>
  );
}

export default App;