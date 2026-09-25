import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { LogIn, ShieldCheck } from 'lucide-react';

/** Tela de login — o usuário é autenticado contra os usuários cadastrados (hash PBKDF2). */
export const LoginView: React.FC = () => {
  const { login, settings } = useRestaurant();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(usuario, senha);
      if (!result.ok) setError(result.error || 'Falha no login.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login.');
    } finally {
      setLoading(false);
    }
  };

  const appName = settings.nomeFantasia || settings.nomeAplicacao;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-sm mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">{appName}</h1>
          <p className="text-xs text-slate-500 mt-1">Acesse com seu usuário operacional</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Usuário</label>
            <input
              id="login-username-input"
              type="text"
              autoFocus
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              placeholder="seu.usuario"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Senha</label>
            <input
              id="login-password-input"
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div id="login-error" role="alert" className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            id="login-submit-btn"
            disabled={loading || !usuario.trim() || !senha}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Entrando…' : 'Entrar'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
