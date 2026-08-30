/*
 * Application entry point
 * Redesigned to force login screen on every load and use the custom background with red flash animations.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  StickyNote,
  LogOut,
  DollarSign,
  Loader2,
  Lock,
  Trophy,
  Bot,
} from 'lucide-react';
import Notes from './components/Notes';
import Login from './components/Login';
import Finance from './components/Finance';
import Accounts from './components/Accounts';
import Ranking from './components/Ranking';
import Jarvis from './components/Jarvis';
import { cn } from './lib/utils';
import { ToastProvider } from './components/Toast';
import { useAuth } from './lib/AuthContext';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';

type Tab = 'notes' | 'finance' | 'accounts' | 'ranking' | 'jarvas';

export default function App() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('finance');
  const [isNotesUnlocked, setIsNotesUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const navigateToTab = (tabId: Tab) => {
    if (tabId === 'notes' && !isNotesUnlocked) {
      setShowPasswordModal(true);
    } else {
      setActiveTab(tabId);
    }
  };



  // Test connection on mount (safely ignored in local mode)
  useEffect(() => {
    const testConnection = async () => {
      if (localStorage.getItem('ghub_guest_user')) return;
      try {
        await getDocFromServer(doc(db, 'system', 'health'));
      } catch (e) {
        // Silently handle offline/guest mode connection errors
      }
    };
    testConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navItems = [
    { id: 'finance', label: '🏦 FINANCEIRO', icon: <DollarSign size={20} /> },
    { id: 'ranking', label: '🏆 PAINEL VIEW', icon: <Trophy size={20} /> },
    { id: 'jarvas', label: '🤖 JARVAS', icon: <Bot size={20} /> },
    { id: 'accounts', label: '🛡️ CONTAS', icon: <Lock size={20} /> },
    { id: 'notes', label: '📑 NOTAS', icon: <StickyNote size={20} /> },
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 size={48} className="text-accent animate-spin" />
      </div>
    );
  }

  // Show login screen when no authenticated user
  if (!user) {
    return (
      <ToastProvider>
        <Login />
      </ToastProvider>
    );
  }

  // Main application UI after successful login
  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg text-white flex flex-col md:flex-row pb-24 md:pb-0 font-sans selection:bg-accent/30">
        {/* Sidebar for Desktop */}
        <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-80 bg-[#111111] border-r border-white/5 flex-col z-50 overflow-y-auto custom-scrollbar">
          {/* Logo Section */}
          <div className="h-32 flex items-center px-10 shrink-0">
            <div
              className="w-14 h-14 bg-accent rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl shadow-accent/20 border border-white/10 relative shrink-0 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
              <span className="relative z-10 tracking-tighter text-white">G</span>
            </div>
            <div className="ml-5">
              <div className="text-2xl font-black tracking-tighter leading-none text-white gradient-text">G-HUB</div>
              <div className="text-[10px] uppercase tracking-[0.3em] font-black text-accent mt-1 opacity-80">
                Hub Estratégico
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 flex flex-col gap-1.5 px-6 py-4">
            <div className="px-4 mb-4 text-[10px] font-black text-text-dim uppercase tracking-[0.3em] opacity-40">
              Arquitetura
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigateToTab(item.id as Tab)}
                className={cn(
                  'relative flex items-center h-14 px-5 rounded-2xl transition-all duration-300 group overflow-hidden shrink-0 interactive-button',
                  activeTab === item.id
                    ? 'bg-accent/10 text-white border border-accent/20 shadow-glow'
                    : 'text-text-dim hover:bg-white/[0.03] hover:text-white'
                )}
              >
                <div
                  className={cn(
                    'shrink-0 transition-all duration-300',
                    activeTab === item.id ? 'scale-110 text-accent' : 'group-hover:scale-110 group-hover:text-white'
                  )}
                >
                  {item.icon}
                </div>
                <span className="ml-4 font-bold text-[13px] tracking-tight uppercase whitespace-nowrap">
                  {item.label}
                </span>
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeSide"
                    className="absolute right-0 w-1 h-6 bg-accent rounded-l-full shadow-[0_0_10px_#E63946]"
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-8 shrink-0 flex flex-col gap-4">
            <button
              onClick={() => logout()}
              className="flex items-center gap-3 px-5 py-4 rounded-2xl text-text-dim hover:text-accent hover:bg-accent/5 transition-all text-sm font-bold group interactive-button"
            >
              <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
              <span className="uppercase tracking-widest text-[11px]">Sair do Sistema</span>
            </button>
            <div className="p-5 glass rounded-3xl border border-white/5 bg-white/[0.01]">
              <div className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] leading-relaxed opacity-60">
                Sistema Operacional<br />
                <span className="text-accent opacity-100">Versão do Protocolo v5.2</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Spacer for desktop layout */}
        <div className="hidden md:block w-80 shrink-0" />

        {/* Bottom navigation for mobile */}
        <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-[#161616] border border-white/5 px-6 py-4 rounded-[2.5rem] flex justify-between items-center z-50 shadow-2xl">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigateToTab(item.id as Tab)}
              className={cn(
                'p-3 rounded-2xl transition-all interactive-button',
                activeTab === item.id ? 'text-accent bg-accent/10 shadow-glow' : 'text-text-dim'
              )}
            >
              {item.icon}
            </button>
          ))}
          <button
            onClick={() => logout()}
            className="p-3 rounded-2xl text-text-dim hover:text-accent transition-all interactive-button"
          >
            <LogOut size={20} />
          </button>
        </nav>

        {/* Main content area */}
        <main className="flex-1 w-full p-6 md:p-12 lg:p-16 overflow-y-auto max-h-screen custom-scrollbar selection:bg-accent/20">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'finance' && <Finance onNavigate={setActiveTab} />}
            {activeTab === 'ranking' && <Ranking onNavigate={setActiveTab} />}
            {activeTab === 'jarvas' && <Jarvis />}
            {activeTab === 'accounts' && <Accounts onNavigate={setActiveTab} />}
            {activeTab === 'notes' && <Notes onNavigate={navigateToTab} />}
          </div>
        </main>

        {/* Password Modal */}
        <AnimatePresence>
          {showPasswordModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md bg-surface border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl"
              >
                {/* Background ambient light */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent/20 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center text-accent mb-6 shadow-glow">
                    <Lock size={28} />
                  </div>

                  <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Acesso Privado</h3>
                  <p className="text-xs text-text-dim uppercase tracking-widest leading-relaxed mb-8">
                    Insira a senha de administrador para acessar suas notas
                  </p>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (passwordInput === '2424') {
                        setIsNotesUnlocked(true);
                        setShowPasswordModal(false);
                        setActiveTab('notes');
                        setPasswordInput('');
                        setPasswordError(false);
                      } else {
                        setPasswordError(true);
                        setPasswordInput('');
                      }
                    }}
                    className="w-full space-y-6"
                  >
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim opacity-60 ml-2">Senha de Entrada</label>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => {
                          setPasswordInput(e.target.value);
                          if (passwordError) setPasswordError(false);
                        }}
                        placeholder="••••"
                        className={cn(
                          "w-full px-6 py-4 bg-white/[0.02] border rounded-2xl text-center text-xl font-bold tracking-[0.5em] transition-all outline-none focus:bg-white/[0.04]",
                          passwordError 
                            ? "border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                            : "border-white/10 text-white focus:border-accent/40 focus:shadow-[0_0_15px_rgba(230,57,70,0.15)]"
                        )}
                        autoFocus
                      />
                      {passwordError && (
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider text-center mt-2 animate-bounce">
                          Senha inválida! Tente novamente.
                        </p>
                      )}
                    </div>

                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordModal(false);
                          setPasswordInput('');
                          setPasswordError(false);
                        }}
                        className="flex-1 py-4 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 font-bold uppercase tracking-widest text-[11px] rounded-2xl transition-all interactive-button"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-4 bg-accent hover:bg-accent/80 text-white font-bold uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-lg shadow-accent/20 interactive-button"
                      >
                        Confirmar
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ToastProvider>
  );
}
