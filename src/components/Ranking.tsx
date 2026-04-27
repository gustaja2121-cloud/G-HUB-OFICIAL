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
import { addDays, differenceInDays, endOfWeek, formatDistanceToNow, isSunday, setHours, setMinutes, setSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Ranking() {
  const [myRank, setMyRank] = useState<string>('');
  const [myViews, setMyViews] = useState<string>('');
  const [leaderRank, setLeaderRank] = useState<string>('');
  const [leaderViews, setLeaderViews] = useState<string>('');
  const [leaderGrowth, setLeaderGrowth] = useState<string>('');
  const [calculating, setCalculating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  
  // Lógica robusta para encontrar o próximo Domingo às 23:59:59
  const getNextSundayMidnight = () => {
    const now = new Date();
    // endOfWeek com weekStartsOn: 1 (Segunda) retorna o Domingo desta semana
    let target = endOfWeek(now, { weekStartsOn: 1 });
    target = setHours(target, 23);
    target = setMinutes(target, 59);
    target = setSeconds(target, 59);

    // Se já passou do fechamento de hoje (caso seja domingo à noite), pula para o próximo domingo
    if (now > target) {
      target = addDays(target, 7);
    }
    return target;
  };

  const [targetDate, setTargetDate] = useState(getNextSundayMidnight());
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const currentNow = new Date();
      setNow(currentNow);
      
      // Se chegamos no alvo, recalcula o próximo domingo
      if (currentNow > targetDate) {
        setTargetDate(getNextSundayMidnight());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

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
    const lGrowth = parseFloat(leaderGrowth) || 0;
    const diff = leader - mine;
    
    // Calcula dias restantes reais (frações de 24h)
    const diffMs = targetDate.getTime() - now.getTime();
    const daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    
    const projectedLeaderGrowth = lGrowth * daysRemaining;
    const totalToOvertake = diff + projectedLeaderGrowth;
    const dailyNeeded = totalToOvertake > 0 ? Math.ceil(totalToOvertake / daysRemaining) : 0;
    const safetyBuffer = Math.ceil(dailyNeeded * 0.15); // 15% safety

    return {
      diff,
      daysRemaining,
      projectedLeaderGrowth,
      totalToOvertake,
      dailyNeeded,
      safetyBuffer,
      progress: leader > 0 ? Math.min((mine / leader) * 100, 100) : 0
    };
  }, [myViews, leaderViews, leaderGrowth, targetDate, now]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

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
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-6xl font-black tracking-tighter leading-none mb-4 uppercase italic">
              <span className="text-white">ARENA</span> <span className="text-red-500">ESTRATÉGICA</span>
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-5">
              <div className="flex items-center gap-2 text-[11px] font-black text-text-dim uppercase tracking-[0.4em] opacity-60">
                 <Zap size={14} className="text-amber-500" /> Operação Top 1
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="flex items-center gap-2 text-[11px] font-black text-red-500 uppercase tracking-[0.4em]">
                 <Timer size={14} /> Ciclo Mensal Atual
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Calculadora de Ultrapassagem - EXPANDIDA */}
        <section className="lg:col-span-5 premium-card bg-surface/60 border-red-500/20 relative overflow-hidden h-fit">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
          
          <div className="flex items-center gap-4 mb-10">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500"><TrendingUp size={20} /></div>
            <h3 className="text-3xl font-black uppercase tracking-tighter gradient-text">Calculadora de Ultrapassagem</h3>
          </div>

          <div className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               {/* Seus Dados */}
               <div className="space-y-6">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-red-500/60 ml-4">Sua Posição Atual</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="md:col-span-1 space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-text-dim opacity-40 ml-4">Posição (#)</label>
                     <input 
                       type="number"
                       value={myRank}
                       onChange={(e) => setMyRank(e.target.value)}
                       className="w-full h-16 bg-bg/50 border border-white/5 rounded-2xl px-6 outline-none focus:border-red-500 transition-all font-black text-xl tracking-tighter text-white"
                       placeholder="Ex: 5"
                     />
                   </div>
                   <div className="md:col-span-2 space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-text-dim opacity-40 ml-4">Suas Views/Pontos Totais</label>
                     <input 
                       type="number"
                       value={myViews}
                       onChange={(e) => setMyViews(e.target.value)}
                       className="w-full h-16 bg-bg/50 border border-white/5 rounded-2xl px-6 outline-none focus:border-red-500 transition-all font-black text-xl tracking-tighter text-white"
                       placeholder="0"
                     />
                   </div>
                 </div>
               </div>

               {/* Dados do Adversário */}
               <div className="space-y-6">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-500/60 ml-4">Alvo para Ultrapassar</h4>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <div className="md:col-span-1 space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-text-dim opacity-40 ml-4">Posição (#)</label>
                     <input 
                       type="number"
                       value={leaderRank}
                       onChange={(e) => setLeaderRank(e.target.value)}
                       className="w-full h-16 bg-bg/50 border border-white/5 rounded-2xl px-6 outline-none focus:border-amber-500 transition-all font-black text-xl tracking-tighter text-white"
                       placeholder="Ex: 1"
                     />
                   </div>
                   <div className="md:col-span-2 space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-text-dim opacity-40 ml-4">Views do Adversário</label>
                     <input 
                       type="number"
                       value={leaderViews}
                       onChange={(e) => setLeaderViews(e.target.value)}
                       className="w-full h-16 bg-bg/50 border border-white/5 rounded-2xl px-6 outline-none focus:border-amber-500 transition-all font-black text-xl tracking-tighter text-white"
                       placeholder="0"
                     />
                   </div>
                   <div className="md:col-span-1 space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-text-dim opacity-40 ml-4">Ganho Diário Est.</label>
                     <input 
                       type="number"
                       value={leaderGrowth}
                       onChange={(e) => setLeaderGrowth(e.target.value)}
                       className="w-full h-16 bg-bg/50 border border-amber-500/20 rounded-2xl px-6 outline-none focus:border-amber-500 transition-all font-black text-xl tracking-tighter text-white"
                       placeholder="+10k"
                     />
                   </div>
                 </div>
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
      </div>

      {/* Seção de Resultados - Foco Total na Meta */}
      <div className="grid grid-cols-1 gap-8">
        {/* Meta de Ultrapassagem - Centralizada e Expandida */}
        <div className="relative min-h-[400px]">
          <AnimatePresence>
            {showResult ? (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="premium-card bg-gradient-to-br from-surface to-blue-900/10 border-blue-500/20 p-12 h-full flex flex-col justify-center relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
                  <Trophy size={140} className="text-blue-500" />
                </div>
                <div className="relative z-10 space-y-12 max-w-4xl mx-auto w-full text-center md:text-left">
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="space-y-4">
                      <div className="text-[11px] font-black uppercase tracking-[0.5em] text-blue-500 italic">Protocolo de Ultrapassagem</div>
                      <div className="flex items-center justify-center md:justify-start gap-8 text-7xl md:text-8xl font-black text-white tracking-tighter">
                        <span>{myRank || '?'}º</span>
                        <ChevronRight className="text-blue-500" size={60} />
                        <span className="text-amber-500">{leaderRank || '?'}º</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-white/5">
                    <div>
                      <div className="text-6xl md:text-7xl font-black text-white tracking-tighter mb-2">
                         {results.totalToOvertake.toLocaleString()}
                      </div>
                      <div className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em]">Views totais para passar (C/ Projeção)</div>
                    </div>
                    
                    <div className="bg-amber-500/5 p-8 rounded-[2.5rem] border border-amber-500/10">
                      <div className="text-5xl md:text-6xl font-black text-amber-500 tracking-tighter mb-2">
                        {results.dailyNeeded.toLocaleString()}
                      </div>
                      <div className="text-[11px] font-black text-amber-500 uppercase tracking-[0.4em]">Sua Meta Diária de Segurança</div>
                    </div>
                  </div>

                  <p className="text-[10px] font-black text-text-dim/40 uppercase tracking-[0.3em] italic">
                    Cálculo baseado em {results.daysRemaining} dias restantes de ciclo.
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="premium-card bg-surface/20 border-dashed border-white/5 h-full flex flex-col items-center justify-center text-center p-12 opacity-40">
                <Sword size={64} className="text-text-dim mb-6 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest text-text-dim">Simule seu ataque no painel acima</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
