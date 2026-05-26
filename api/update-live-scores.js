import { createClient } from '@supabase/supabase-js';

// 1. Inicjalizacja klienta Supabase z uprawnieniami ADMINA (Service Role)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Klucz zapisany w zmiennych środowiskowych Vercel
);

export default async function handler(req, res) {
    console.log("1. Hasło z panelu Vercel to:", process.env.CRON_SECRET);
    console.log("2. Nagłówek odebrany z cron-job.org to:", req.headers.authorization);
  // Opcjonalne: zabezpieczenie endpointu przed nieautoryzowanym uruchomieniem
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 2. Zapytanie do zewnętrznego API o mecze na żywo (np. API-Football dla MŚ 2026 - ID ligi przykładowe)
    const apiResponse = await fetch('https://v3.football.api-sports.io/fixtures?live=all&league=1', {
      method: 'GET',
      headers: {
        'x-apisports-key': process.env.API_FOOTBALL_KEY
      }
    });
    
    const apiData = await apiResponse.json();
    const liveFixtures = apiData.response;

    if (!liveFixtures || liveFixtures.length === 0) {
      return res.status(200).json({ message: 'Brak trwających meczów do aktualizacji.' });
    }

    // 3. Przetwarzanie i aktualizacja każdego trwającego spotkania
    for (const fixture of liveFixtures) {
      const apiMatchId = fixture.fixture.id;
      const homeScore = fixture.goals.home;
      const awayScore = fixture.goals.away;
      
      // Mapowanie statusu z API na nasz wewnętrzny format
      const statusShort = fixture.fixture.status.short; 
      let dbStatus = 'live';
      
      // 'FT' - Full Time, 'AET' - After Extra Time, 'PEN' - Penalties
      if (['FT', 'AET', 'PEN'].includes(statusShort)) {
        dbStatus = 'finished';
      }

      // 4. Nadpisanie danych w Supabase
      const { error } = await supabase
        .from('matches')
        .update({ 
          home_score: homeScore, 
          away_score: awayScore, 
          status: dbStatus 
        })
        .eq('api_id', apiMatchId)
        // Optymalizacja: aktualizujemy tylko te, które w naszej bazie nie mają jeszcze statusu 'finished'
        .neq('status', 'finished'); 

      if (error) {
        console.error(`Błąd przy aktualizacji meczu ${apiMatchId}:`, error.message);
      }
    }

    return res.status(200).json({ success: true, updatedCount: liveFixtures.length });

  } catch (error) {
    console.error('Błąd krytyczny funkcji:', error);
    return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
}