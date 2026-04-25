/**
 * AuthModal — Modal de login/cadastro com 3 métodos
 * Email, Google OAuth, MetaMask Wallet
 * Design: Glassmorphism, dark, compacto
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Chrome, Wallet, Loader2, Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AuthView = 'main' | 'email-login' | 'email-signup';

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithWallet } = useAuth();
  const [view, setView] = useState<AuthView>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError(null);
    setSuccess(null);
    setShowPassword(false);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const result = await signInWithEmail(email, password);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setIsLoading(true);
    setError(null);
    const result = await signUpWithEmail(email, password, name);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Conta criada! Verifique seu email para confirmar.');
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    setError(null);
    const result = await signInWithGoogle();
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    }
    // Google OAuth redireciona — onSuccess será chamado pelo AuthContext
  };

  const handleWallet = async () => {
    setIsLoading(true);
    setError(null);
    const result = await signInWithWallet();
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(139,92,246,0.1)]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {view === 'main' && (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Entrar no UrbanLayer</h2>
                    <p className="text-sm text-gray-400">Escolha como deseja acessar a plataforma</p>
                  </div>

                  {/* Auth Methods */}
                  <div className="space-y-3">
                    {/* Wallet (destaque) */}
                    <button
                      onClick={handleWallet}
                      disabled={isLoading}
                      className="w-full flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30 rounded-2xl hover:border-purple-400/50 transition-all group disabled:opacity-50"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-shadow">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold text-sm">MetaMask / Wallet EVM</p>
                        <p className="text-xs text-gray-400">Conecte sua carteira de cripto</p>
                      </div>
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
                    </button>

                    {/* Google */}
                    <button
                      onClick={handleGoogle}
                      disabled={isLoading}
                      className="w-full flex items-center gap-4 px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/[0.06] hover:border-white/20 transition-all group disabled:opacity-50"
                    >
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <Chrome className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold text-sm">Google</p>
                        <p className="text-xs text-gray-400">Acesso rápido com sua conta Google</p>
                      </div>
                    </button>

                    {/* Email Login */}
                    <button
                      onClick={() => { resetForm(); setView('email-login'); }}
                      className="w-full flex items-center gap-4 px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/[0.06] hover:border-white/20 transition-all group"
                    >
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold text-sm">Email e Senha</p>
                        <p className="text-xs text-gray-400">Acesse com sua conta ou crie uma nova</p>
                      </div>
                    </button>
                  </div>

                  {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 text-center">
                      {error}
                    </div>
                  )}

                  <p className="text-center text-xs text-gray-600 mt-6">
                    Ao continuar, você concorda com os Termos de Uso.
                  </p>
                </motion.div>
              )}

              {view === 'email-login' && (
                <motion.div
                  key="email-login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <button onClick={() => { resetForm(); setView('main'); }} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>

                  <h2 className="text-xl font-bold mb-6">Entrar com Email</h2>

                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider font-mono block mb-2">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="seu@email.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-wider font-mono block mb-2">Senha</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors pr-10 placeholder:text-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
                    </button>
                  </form>

                  <p className="text-center text-sm text-gray-500 mt-6">
                    Não tem conta?{' '}
                    <button onClick={() => { resetForm(); setView('email-signup'); }} className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                      Criar agora
                    </button>
                  </p>
                </motion.div>
              )}

              {view === 'email-signup' && (
                <motion.div
                  key="email-signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <button onClick={() => { resetForm(); setView('main'); }} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>

                  <h2 className="text-xl font-bold mb-6">Criar Conta</h2>

                  {success ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-400" />
                      </div>
                      <p className="text-green-400 font-semibold mb-2">Conta criada!</p>
                      <p className="text-sm text-gray-400">Verifique seu email para confirmar o cadastro.</p>
                      <button
                        onClick={() => { resetForm(); setView('email-login'); }}
                        className="mt-6 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
                      >
                        Ir para Login
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleEmailSignup} className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider font-mono block mb-2">Nome</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Seu nome artístico"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-gray-600"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider font-mono block mb-2">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="seu@email.com"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-gray-600"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider font-mono block mb-2">Senha</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors pr-10 placeholder:text-gray-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Conta'}
                      </button>
                    </form>
                  )}

                  {!success && (
                    <p className="text-center text-sm text-gray-500 mt-6">
                      Já tem conta?{' '}
                      <button onClick={() => { resetForm(); setView('email-login'); }} className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                        Fazer login
                      </button>
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
