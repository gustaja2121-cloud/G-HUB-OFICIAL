/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Calendar, 
  StickyNote, 
  Plus,
  LogOut,
  FileText,
  DollarSign,
  Lightbulb,
  Loader2,
  Scissors,
  Lock
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Notes from './components/Notes';
import Login from './components/Login';
import Finance from './components/Finance';
import Cortes from './components/Cortes';
import Accounts from './components/Accounts';
import { cn } from './lib/utils';
import { ToastProvider } from './components/Toast';
import { useAuth } from './lib/AuthContext';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';
import { useEffect } from 'react';

type Tab = 'dashboard' | 'notes' | 'finance' | 'cortes' | 'accounts';

export default function App() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'system', 'health'));
      } catch (e) {
        if (e instanceof Error && e.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Painel', icon: <LayoutDashboard size={20} /> },
    { id: 'cortes', label: 'Cortes', icon: <Scissors size={20} /> },
    { id: 'finance', label: 'Financeiro', icon: <DollarSign size={20} /> },
    { id: 'accounts', label: 'Contas', icon: <Lock size={20} /> },
    { id: 'notes', label: 'Notas', icon: <StickyNote size={20} /> },
  ] as const;

  const renderContent = () => {
    const commonProps = { onNavigate: setActiveTab };
    switch (activeTab) {
      case 'dashboard': return <Dashboard {...commonProps} />;
      case 'notes': return <Notes {...commonProps} />;
      case 'finance': return <Finance {...commonProps} />;
      case 'cortes': return <Cortes {...commonProps} />;
      case 'accounts': return <Accounts {...commonProps} />;
      default: return <Dashboard {...commonProps} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 size={48} className="text-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <ToastProvider>
        <Login />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg text-white flex flex-col md:flex-row pb-24 md:pb-0 font-sans selection:bg-accent/30">
        {/* Sidebar for Desktop */}
        <aside 
          className="hidden md:flex fixed left-0 top-0 bottom-0 w-80 bg-surface/50 backdrop-blur-2xl border-r border-white/5 flex-col z-50 overflow-y-auto custom-scrollbar"
        >
          {/* Logo Section */}
          <div className="h-32 flex items-center px-10 shrink-0">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-14 h-14 bg-accent rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl shadow-accent/20 border border-white/10 relative shrink-0 overflow-hidden group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
              <span className="relative z-10 tracking-tighter text-white">G</span>
              <motion.div 
                className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                animate={{ rotate: [0, 90, 180, 270, 360] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            <div className="ml-5">
              <div className="text-2xl font-black tracking-tighter leading-none text-white gradient-text">G-HUB</div>
              <div className="text-[10px] uppercase tracking-[0.3em] font-black text-accent mt-1 opacity-80">Hub Estratégico</div>
            </div>
          </div>

          <nav className="flex-1 flex flex-col gap-1.5 px-6 py-4">
            <div className="px-4 mb-4 text-[10px] font-black text-text-dim uppercase tracking-[0.3em] opacity-40">
              Arquitetura
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "relative flex items-center h-14 px-5 rounded-2xl transition-all duration-300 group overflow-hidden shrink-0 interactive-button",
                  activeTab === item.id 
                    ? "bg-accent/10 text-white border border-accent/20 shadow-glow" 
                    : "text-text-dim hover:bg-white/[0.03] hover:text-white"
                )}
              >
                <div className={cn(
                  "shrink-0 transition-all duration-300",
                  activeTab === item.id ? "scale-110 text-accent" : "group-hover:scale-110 group-hover:text-white"
                )}>
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
                Sistema Operacional<br/>
                <span className="text-accent opacity-100">Versão do Protocolo v5.2</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Padding for content on desktop (matches sidebar width) */}
        <div className="hidden md:block w-80 shrink-0" />

        {/* Bottom Nav for Mobile */}
        <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-surface/80 backdrop-blur-2xl border border-white/5 px-6 py-4 rounded-[2.5rem] flex justify-between items-center z-50 shadow-2xl">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "p-3 rounded-2xl transition-all interactive-button",
                activeTab === item.id ? "text-accent bg-accent/10 shadow-glow" : "text-text-dim"
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


        <main className="flex-1 w-full p-6 md:p-12 lg:p-16 overflow-y-auto max-h-screen custom-scrollbar selection:bg-accent/20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
              transition={{ 
                duration: 0.4,
                ease: [0.23, 1, 0.32, 1] 
              }}
              className="max-w-6xl mx-auto"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </ToastProvider>
  );
}
