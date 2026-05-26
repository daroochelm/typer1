import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import MatchCard from './components/MatchCard';
import LiveLeaderboard from './components/LiveLeaderboard';
import Auth from './components/Auth';

function App() {
  const [session, setSession] = useState(null);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  // 1. Zarządzanie sesją (Logowanie)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Pobieranie nadchodzących meczów z bazy danych
  useEffect(() => {
    // Pobieramy dane tylko wtedy, gdy użytkownik jest zalogowany
    if (session) {
      const fetchMatches = async () => {
        setLoadingMatches(true);
        const { data, error } = await supabase
          .from('matches')
          .select('*')
          .eq('status', 'scheduled') // Tylko mecze, które jeszcze się nie zaczęły
          .order('match_date', { ascending: true }); // Sortujemy od najbliższego

        if (error) {
          console.error("Błąd pobierania meczów:", error);
        } else if (data) {
          setUpcomingMatches(data);
        }
        setLoadingMatches(false);
      };

      fetchMatches();
    }
  }, [session]); // Tablica zależności – pobierz ponownie, jeśli zmieni się sesja

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // EKRAN LOGOWANIA (jeśli użytkownik nie ma sesji)
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

  // GŁÓWNA APLIKACJA (jeśli użytkownik jest zalogowany)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      {/* Pasek nawigacji / Nagłówek */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-gray-800 tracking-tight">
          Mundial <span className="text-blue-600">2026</span> Typer
        </h1>
        <button
          onClick={handleSignOut}
          className="text-xs md:text-sm bg-gray-200 hover:bg-gray-300 text-gray-600 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Wyloguj się
        </button>
      </div>
      
      {/* Sekcja: Mecze do typowania */}
      <div className="w-full max-w-5xl mb-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Do wytypowania</h2>
        
        {loadingMatches ? (
          <div className="text-center py-10 text-gray-500 animate-pulse">
            Ładowanie harmonogramu spotkań...
          </div>
        ) : upcomingMatches.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-gray-100 text-center text-gray-500 shadow-sm">
            Wszystkie mecze zostały rozegrane. Czekamy na dodanie nowych!
          </div>
        ) : (
          // Używamy CSS Grid z Tailwind, aby ułożyć karty responsywnie (1 kolumna na telefonie, 2 na tablecie, 3 na PC)
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} user={session.user} />
            ))}
          </div>
        )}
      </div>
      
      {/* Sekcja: Ranking Live */}
      <div className="w-full max-w-5xl flex justify-center border-t pt-8">
        <LiveLeaderboard />
      </div>
    </div>
  );
}

export default App;