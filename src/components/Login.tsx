import { motion } from 'motion/react';
import { Loader2, TrendingUp } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useToast } from './Toast';
import { useState } from 'react';

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
      showToast('Login realizado com sucesso!', 'success');
    } catch (error: any) {
      console.error('Falha no login:', error);
      let message = 'Ocorreu um erro ao tentar entrar.';
      
      if (error?.code === 'auth/unauthorized-domain') {
        message = 'Domínio não autorizado. Verifique as configurações do Firebase.';
      } else if (error?.code === 'auth/popup-blocked') {
        message = 'O popup foi bloqueado pelo navegador.';
      } else if (error?.code === 'auth/cancelled-popup-request') {
        message = 'Login cancelado.';
      }
      
      showToast(message, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-red-900/10 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="text-center mb-16">
          <motion.div 
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
            className="w-28 h-28 bg-accent rounded-[2.5rem] flex items-center justify-center font-black text-6xl mx-auto shadow-2xl shadow-accent/20 border border-white/10 relative overflow-hidden group cursor-default mb-10"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
            <span className="relative z-10 tracking-tighter text-white">G</span>
            <motion.div 
              className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
              animate={{ rotate: [0, 90, 180, 270, 360] }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
          
          <h1 className="text-6xl font-black tracking-tighter leading-none mb-4 gradient-text">G-HUB</h1>
          <p className="text-[11px] uppercase tracking-[0.6em] font-black text-accent opacity-80 mb-2">Central de Inteligência Estratégica</p>
          <div className="w-16 h-1 bg-accent/20 mx-auto rounded-full mt-6" />
        </div>

        <div className="premium-card p-12 text-center flex flex-col gap-10">
          <div className="space-y-3">
             <h2 className="text-2xl font-black tracking-tight uppercase">Acesso Restrito</h2>
             <p className="text-sm font-bold text-text-dim uppercase tracking-widest leading-relaxed">
               Conecte sua conta Google para sincronizar seu<br/>
               <span className="text-accent">Protocolo de Alta Performance</span>
             </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.2em] rounded-3xl flex items-center justify-center gap-4 hover:bg-white/90 transition-all shadow-2xl shadow-white/5 active:shadow-none group interactive-button cursor-pointer disabled:opacity-50"
          >
            {isLoggingIn ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Deploy via Google
              </>
            )}
          </motion.button>

          <div className="flex flex-col gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-text-dim">
            <div className="flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-white/5" />
              <span>G-HUB OS v5.2</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            <p className="opacity-40 max-w-[280px] mx-auto italic">
              Seu progresso é criptografado e sincronizado com o Nexus de Dados.
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="mt-12 flex justify-center gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-text-dim opacity-40">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]" />
              Secure Sync
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_#E63946]" />
              High Speed
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" />
              Strategic AI
           </div>
        </div>
      </motion.div>
    </div>
  );
}
