import MatchCard from './components/MatchCard';
import LiveLeaderboard from './components/LiveLeaderboard';

function App() {
  // Przykładowy mecz do testowania MatchCard
  const testMatch = {
    id: 1,
    home_team: 'Polska',
    away_team: 'Argentyna',
    match_date: '2026-06-15T17:00:00Z',
    status: 'scheduled'
  };

  const dummyUser = { id: 'TUTAJ_WKLEJ_UUID_Z_BAZY' };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <h1 className="text-4xl font-black mb-8 text-gray-800 tracking-tight">
        Mundial <span className="text-blue-600">2026</span> Typer
      </h1>
      
      {/* Sekcja typowania nadchodzących spotkań */}
      <MatchCard match={testMatch} user={dummyUser} />
      
      {/* Nasz nowy interaktywny ranking */}
      <LiveLeaderboard />
    </div>
  );
}

export default App;