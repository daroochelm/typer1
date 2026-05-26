import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignUp) {
      // REJESTRACJA
      if (!displayName.trim()) {
        setMessage('Wpisz swoje imię/pseudonim!');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Przekazujemy imię do metadanych, skąd nasz SQL Trigger przepisze je do profili
          data: { display_name: displayName } 
        }
      });

      if (error) setMessage(`Błąd rejestracji: ${error.message}`);
      else setMessage('Konto utworzone! Możesz się teraz zalogować.');
    } else {
      // LOGOWANIE
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(`Błąd logowania: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-md border border-gray-100 p-6 mt-10">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        {isSignUp ? 'Stwórz konto gracza' : 'Zaloguj się do Typera'}
      </h2>

      <form onSubmit={handleAuth} className="space-y-4">
        {isSignUp && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Twoje Imię / Nick (widoczne w rankingu)</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="np. Seba"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adres E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="twoj@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:bg-blue-400"
        >
          {loading ? 'Przetwarzanie...' : isSignUp ? 'Zarejestruj się' : 'Zaloguj się'}
        </button>
      </form>

      {message && (
        <p className={`text-sm text-center mt-4 ${message.includes('Błąd') ? 'text-red-500' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      <div className="text-center mt-6">
        <button
          onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }}
          className="text-sm text-blue-600 hover:underline focus:outline-none"
        >
          {isSignUp ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
        </button>
      </div>
    </div>
  );
}