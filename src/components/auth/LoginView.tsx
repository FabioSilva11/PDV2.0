import React, { useState } from 'react';
import { LockKeyhole, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import { StaffUser } from '../../types';

interface LoginViewProps {
  staffList: StaffUser[];
  onLogin: (user: StaffUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ staffList, onLogin }) => {
  const [usuario, setUsuario] = useState('admin');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const normalizedUser = usuario.trim().toLowerCase();
    const user = staffList.find(candidate =>
      candidate.usuario.toLowerCase() === normalizedUser &&
      candidate.senha === senha &&
      candidate.status === 'ativo' &&
      candidate.ativo !== false
    );

    if (!user) {
      setError('Usuário ou senha inválidos, ou usuário inativo.');
      return;
    }

    onLogin(user);
  };

  return (
    <main className="min-h-screen bg-stone-950 flex items-center justify-center p-4 text-stone-900">
      <div className="w-full max-w-5xl min-h-[580px] overflow-hidden rounded-3xl bg-white shadow-2xl grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:flex bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 p-12 text-white flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-2xl font-extrabold shadow-lg">M</div>
              <div>
                <p className="font-extrabold tracking-wide">Murupi SaaS</p>
                <p className="text-xs text-stone-400">Gestão para restaurantes</p>
              </div>
            </div>
            <h1 className="mt-20 max-w-md text-4xl font-extrabold leading-tight font-serif">
              Sua operação começa com acesso seguro.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-stone-300">
              Controle pedidos, caixa, cardápio, estoque e equipe em um só lugar.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Acesso protegido por usuário e senha
          </div>
        </section>

        <section className="flex items-center justify-center p-7 sm:p-12">
          <div className="w-full max-w-sm">
            <div className="lg:hidden flex items-center gap-3 mb-12">
              <div className="w-11 h-11 rounded-2xl bg-amber-600 flex items-center justify-center text-white text-xl font-extrabold">M</div>
              <div>
                <p className="font-extrabold text-stone-900">Murupi SaaS</p>
                <p className="text-xs text-stone-500">Gestão para restaurantes</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-700">Bem-vindo</p>
              <h2 className="mt-2 text-3xl font-extrabold text-stone-900 font-serif">Entrar no sistema</h2>
              <p className="mt-2 text-sm text-stone-500">Informe suas credenciais para continuar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="login-usuario" className="text-xs font-extrabold uppercase tracking-wider text-stone-700">Usuário</label>
                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    id="login-usuario"
                    type="text"
                    autoComplete="username"
                    required
                    value={usuario}
                    onChange={event => setUsuario(event.target.value)}
                    placeholder="Digite seu usuário"
                    className="w-full rounded-xl border border-stone-300 py-3 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-senha" className="text-xs font-extrabold uppercase tracking-wider text-stone-700">Senha</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    id="login-senha"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={senha}
                    onChange={event => setSenha(event.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full rounded-xl border border-stone-300 py-3 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-800">
                  {error}
                </div>
              )}

              <button type="submit" className="w-full rounded-xl bg-amber-600 py-3 text-sm font-extrabold text-white shadow-lg shadow-amber-600/20 transition-colors hover:bg-amber-700 flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" />
                Entrar
              </button>
            </form>

            <p className="mt-8 text-center text-[11px] text-stone-400">Murupi Restaurante • Sistema PDV & Gestão</p>
          </div>
        </section>
      </div>
    </main>
  );
};
