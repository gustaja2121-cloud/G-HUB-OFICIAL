import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Target, 
  Zap, 
  Timer, 
  Sword, 
  Flame, 
  ArrowUpRight, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { differenceInDays, endOfWeek, formatDistanceToNow, isSunday, setHours, setMinutes, setSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Ranking() {
  const [myViews, setMyViews] = useState<string>('');
  const [leaderViews, setLeaderViews] = useState<string>('');
  const [calculating, setCalculating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  
  // Calculate Sunday midnight
  const getNextSundayMidnight = () => {
    let nextSunday = endOfWeek(new Date(), { weekStartsOn: 1 }); // Sunday is the end of week
    nextSunday = setHours(nextSunday, 23);
    nextSunday = setMinutes(nextSunday, 59);
    nextSunday = setSeconds(nextSunday, 59);
    return nextSunday;
  };

  const [timeLeft, setTimeLeft] = useState(getNextSundayMidnight());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getNextSundayMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCalculate = () => {
    setCalculating(true);
    setShowResult(false);
    setTimeout(() => {
      setCalculating(false);
      setShowResult(true);
    }, 1200);
  };

  const results = useMemo(() => {
    const mine = parseFloat(myViews) || 0;
    const leader = parseFloat(leaderViews) || 0;
    const diff = leader - mine;
    
    const now = new Date();
    const sunday = getNextSundayMidnight();
    const daysRemaining = Math.max(1, differenceInDays(sunday, now) + 1);
    
    const dailyNeeded = diff > 0 ? Math.ceil(diff / daysRemaining) : 0;
    const extraToWin = Math.ceil(dailyNeeded * 1.1); // 10% more for safety

    return {
      diff,
      daysRemaining,
      dailyNeeded,
      extraToWin,
      progress: leader > 0 ? Math.min((mine / leader) * 100, 100) : 0
    };
  }, [myViews, leaderViews]);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 pt-10 font-sans">
      {/* Header Estilo Arena */}
      <header className="relative group overflow-hidden rounded-[3.5rem] bg-surface/40 backdrop-blur-3xl border border-white/5 p-12 shadow-premium">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Trophy size={200} />
        </div>
        
        <div className="relative flex flex-col md:flex-row items-center gap-10">
          <div className="relative">
            <div className="absolute -inset-4 bg-red-500/20 blur-xl rounded-full animate-pulse" />
            <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-amber-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl border border-white/10 relative overflow-hidden">
              <Sword size={44} />
            </div>
          </div>
          
          <div className="flex-1">
            <h1 className="text-6xl font-black tracking-tighter leading-none mb-4 uppercase italic">
              <span className="text-white">ARENA</span> <span className="text-red-500">DE RANKING</span>
            </h1>
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2 text-[11px] font-black text-text-dim uppercase tracking-[0.4em] opacity-60">
                 <Zap size={14} className="text-amber-500" /> Operação Top 1 Ativada
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="flex items-center gap-2 text-[11px] font-black text-red-500 uppercase tracking-[0.4em]">
                 <Timer size={14} /> Ciclo Mensal: {formatDistanceToNow(timeLeft, { locale: ptBR, addSuffix: true })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Calculadora de Ultrapassagem */}
        <section className="lg:col-span-3 premium-card bg-surface/60 border-red-500/20 relative overflow-hidden h-fit">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
          
          <div className="flex items-center gap-4 mb-10">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500"><TrendingUp size={20} /></div>
            <h3 className="text-3xl font-black uppercase tracking-tighter gradient-text">Calculadora de Ultrapassagem</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim ml-4 opacity-60">Suas Views/Pontos</label>
              <div className="relative">
                <input 
                  type="number"
                  value={myViews}
                  onChange={(e) => setMyViews(e.target.value)}
                  className="w-full h-20 bg-bg/50 border border-white/5 rounded-[2rem] px-8 outline-none focus:border-red-500 transition-all font-black text-3xl tracking-tighter text-white"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim ml-4 opacity-60">Views/Pontos do Líder</label>
              <div className="relative">
                <input 
                  type="number"
                  value={leaderViews}
                  onChange={(e) => setLeaderViews(e.target.value)}
                  className="w-full h-20 bg-bg/50 border border-white/10 rounded-[2rem] px-8 outline-none focus:border-amber-500 transition-all font-black text-3xl tracking-tighter text-white"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleCalculate}
            disabled={!myViews || !leaderViews || calculating}
            className="w-full h-24 mt-12 bg-gradient-to-r from-red-600 to-amber-600 rounded-[2.5rem] text-white font-black text-xl uppercase tracking-[0.2em] shadow-2xl shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-4 group disabled:opacity-30 disabled:grayscale"
          >
            {calculating ? (
              <RefreshCw className="animate-spin" />
            ) : (
              <>
                <Flame className="group-hover:animate-bounce" />
                SIMULAR ESTRATÉGIA DE VITÓRIA
                <ChevronRight />
              </>
            )}
          </button>
        </section>

        {/* Countdown Visual */}
        <section className="lg:col-span-2 premium-card flex flex-col justify-center items-center gap-6 bg-red-950/10 border-red-500/10 text-center relative overflow-hidden">
           <div className="absolute inset-0 opacity-5 pointer-events-none">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-500 via-transparent to-transparent animate-pulse" />
           </div>
           
           <Timer size={60} className="text-red-500 mb-2" />
           <div className="text-[10px] font-black uppercase tracking-[0.5em] text-red-500">Tempo para o Reset (Domingo)</div>
           <div className="text-7xl font-black tracking-tighter text-white tabular-nums">
             {timeLeft.getDate() - new Date().getDate()}D {timeLeft.getHours() - new Date().getHours()}H
           </div>
           <p className="text-[11px] font-bold text-text-dim italic opacity-60">O ranking mensal atualiza domingo à meia-noite!</p>
        </section>
      </div>

      {/* Resultados e Análise */}
      <AnimatePresence>
        {showResult && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Gap de Ultrapassagem */}
            <div className="premium-card bg-gradient-to-br from-surface to-red-900/10 border-red-500/20 p-10 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-6">Diferença para o Top 1</div>
                <div className="text-6xl font-black text-white tracking-tighter">
                  {results.diff > 0 ? results.diff.toLocaleString() : 'LÍDER!'}
                </div>
                <div className="text-[11px] font-black text-text-dim uppercase mt-4">
                  {results.diff > 0 ? `Faltam ${(results.leaderViews - results.myViews)} views` : 'Você está na frente!'}
                </div>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full mt-10 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${results.progress}%` }}
                  className="h-full bg-red-500 shadow-glow" 
                />
              </div>
            </div>

            {/* Plano de Ação Diário */}
            <div className="premium-card bg-gradient-to-br from-surface to-amber-900/10 border-amber-500/20 p-10">
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-6">Plano de Ataque Diário</div>
              <div className="space-y-6">
                <div>
                  <div className="text-5xl font-black text-white tracking-tighter">{results.dailyNeeded.toLocaleString()}</div>
                  <div className="text-[10px] font-black text-text-dim uppercase tracking-widest">Views p/ dia até domingo</div>
                </div>
                <div className="pt-6 border-t border-white/5">
                  <div className="text-3xl font-black text-amber-500 tracking-tighter">{results.extraToWin.toLocaleString()}</div>
                  <div className="text-[10px] font-black text-text-dim uppercase tracking-widest">Ritmo Seguro (Margem de 10%)</div>
                </div>
              </div>
            </div>

            {/* Conselhos do Nexus */}
            <div className="premium-card bg-surface/40 p-10 flex flex-col justify-center gap-6">
              <div className="flex items-center gap-3 text-red-500">
                <Zap size={20} />
                <h4 className="text-sm font-black uppercase tracking-widest">Estratégia de Guerra</h4>
              </div>
              <div className="space-y-4">
                {results.diff > 10000 ? (
                  <div className="flex gap-4 p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                    <AlertTriangle className="text-red-500 shrink-0" size={20} />
                    <p className="text-[11px] font-bold text-text-dim leading-relaxed italic">"O gap é grande. Foco total em volume. Dobre o número de postagens para assustar o líder."</p>
                  </div>
                ) : results.diff > 0 ? (
                  <div className="flex gap-4 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                    <TrendingUp className="text-amber-500 shrink-0" size={20} />
                    <p className="text-[11px] font-bold text-text-dim leading-relaxed italic">"Você está na cola! Um post viral agora te coloca no Top 1. Melhore o Hook dos próximos vídeos."</p>
                  </div>
                ) : (
                  <div className="flex gap-4 p-4 bg-green-500/5 rounded-2xl border border-green-500/10">
                    <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                    <p className="text-[11px] font-bold text-text-dim leading-relaxed italic">"Status: LÍDER. Mantenha o ritmo de manutenção e monitore se o cara de baixo está acelerando."</p>
                  </div>
                )}
                
                <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <Target className="text-white shrink-0" size={20} />
                  <p className="text-[11px] font-bold text-text-dim leading-relaxed italic">"Faltam {results.daysRemaining} dias de guerra. Domingo à meia-noite o trono é seu."</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
