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
  RefreshCw,
  History,
  Trash2,
  ArrowDownRight,
  Target as TargetIcon,
  ShieldAlert
} from 'lucide-react';
import { addDays, differenceInDays, endOfWeek, setHours, setMinutes, setSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { storage } from '../lib/storage';
import { RankingSimulation } from '../types';
import { useToast } from './Toast';
import { useAuth } from '../lib/AuthContext';

export default function Ranking({ onNavigate }: { onNavigate?: (tab: any) => void }) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [myRank, setMyRank] = useState<string>('');
  const [myViews, setMyViews] = useState<string>('');
  const [leaderRank, setLeaderRank] = useState<string>('');
  const [leaderViews, setLeaderViews] = useState<string>('');
  const [leaderGrowth, setLeaderGrowth] = useState<string>('');
  
  const [calculating, setCalculating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState<RankingSimulation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Timer logic
  const getNextSundayMidnight = () => {
    const now = new Date();
    let target = endOfWeek(now, { weekStartsOn: 1 });
    target = setHours(target, 23);
    target = setMinutes(target, 59);
    target = setSeconds(target, 59);
    if (now > target) target = addDays(target, 7);
    return target;
  };

  const [targetDate, setTargetDate] = useState(getNextSundayMidnight());
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const currentNow = new Date();
      setNow(currentNow);
      if (currentNow > targetDate) setTargetDate(getNextSundayMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  // Load history - depends on user being available
  useEffect(() => {
    if (!user) {
      setIsLoadingHistory(false);
      return;
    }
    
    let unsub: (() => void) | undefined;
    
    // Small delay to ensure auth.currentUser is synced
    const timeout = setTimeout(() => {
      try {
        unsub = storage.subscribeRankings((data) => {
          setHistory(data as RankingSimulation[]);
          setIsLoadingHistory(false);
        });
      } catch (e) {
        console.error('Error subscribing to rankings:', e);
        setIsLoadingHistory(false);
      }
    }, 300);
    
    // Safety timeout: if it takes more than 8s, stop loading
    const safetyTimeout = setTimeout(() => {
      if (isLoadingHistory) {
        setIsLoadingHistory(false);
        showToast('Sincronização do Log de Guerra excedeu o tempo limite (Verifique permissões)', 'error');
      }
    }, 8000);
    
    return () => {
      clearTimeout(timeout);
      clearTimeout(safetyTimeout);
      unsub?.();
    };
  }, [user]);

  // Countdown calculation
  const countdown = useMemo(() => {
    const diffMs = targetDate.getTime() - now.getTime();
    if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds };
  }, [targetDate, now]);

  const results = useMemo(() => {
    const mine = parseFloat(myViews) || 0;
    const leader = parseFloat(leaderViews) || 0;
    const lGrowth = parseFloat(leaderGrowth) || 0;
    const diff = leader - mine;
    
    const diffMs = targetDate.getTime() - now.getTime();
    const daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    
    const projectedLeaderGrowth = lGrowth * daysRemaining;
    const totalToOvertake = diff + projectedLeaderGrowth;
    const dailyNeeded = totalToOvertake > 0 ? Math.ceil(totalToOvertake / daysRemaining) : 0;
    const safetyBuffer = Math.ceil(dailyNeeded * 0.15);

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

  const handleCalculate = async () => {
    if (!myViews || !leaderViews) {
      showToast('Preencha os campos obrigatórios', 'error');
      return;
    }
    
    setCalculating(true);
    setShowResult(false);
    
    try {
      // Simulate thinking for a premium feel
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const simulation: any = {
        myRank,
        myViews,
        leaderRank,
        leaderViews,
        leaderGrowth,
        results
      };

      await storage.saveRanking(simulation);
      
      setShowResult(true);
      showToast('Protocolo de Ataque Sincronizado', 'success');
    } catch (e: any) {
      console.error('Erro na simulação:', e);
      const msg = e?.message || 'Erro desconhecido';
      // Try to extract a meaningful message
      try {
        const parsed = JSON.parse(msg);
        showToast(`Erro: ${parsed.error || msg}`, 'error');
      } catch {
        showToast(`Falha: ${msg.substring(0, 80)}`, 'error');
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este registro da Arena?')) {
      try {
        await storage.deleteRanking(id);
        showToast('Registro eliminado');
      } catch (e) {
        console.error('Erro ao excluir:', e);
        showToast('Erro ao excluir registro', 'error');
      }
    }
  };

  const loadFromHistory = (sim: RankingSimulation) => {
    setMyRank(sim.myRank);
    setMyViews(sim.myViews);
    setLeaderRank(sim.leaderRank);
    setLeaderViews(sim.leaderViews);
    setLeaderGrowth(sim.leaderGrowth);
    setShowResult(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 pt-10">
      {/* Arena Header - Ultra Premium */}
      <header className="relative group overflow-hidden rounded-[4rem] bg-surface/40 backdrop-blur-3xl border border-white/5 p-16 shadow-premium">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-amber-500/5" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-500/10 blur-[120px] rounded-full" />
        
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex items-center gap-10">
            <div className="relative">
              <div className="absolute -inset-6 bg-red-600/30 blur-2xl rounded-full animate-pulse" />
              <div className="w-28 h-28 bg-gradient-to-tr from-red-600 to-amber-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl border border-white/20 relative z-10">
                <Sword size={48} className="drop-shadow-glow" />
              </div>
            </div>
            
            <div className="text-center md:text-left">
              <h1 className="text-7xl font-black tracking-tighter leading-none mb-4 italic uppercase">
                ARENA <span className="text-red-500">NEXUS</span>
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-5">
                <div className="flex items-center gap-3 px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">
                   <Flame size={14} className="animate-bounce" /> Dominação Ativa
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <div className="flex items-center gap-2 text-[10px] font-black text-text-dim uppercase tracking-[0.4em] opacity-60">
                   <TargetIcon size={14} /> Ciclo de Guerra Semanal
                </div>
              </div>
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 p-8 rounded-[2.5rem] min-w-[280px]">
            <div className="flex items-center gap-3 mb-2 opacity-50">
               <Timer size={16} />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tempo para Fechamento</span>
            </div>
            <div className="text-4xl font-black text-white font-mono tracking-widest flex gap-2">
               {countdown.days}d : {String(countdown.hours).padStart(2, '0')}h : {String(countdown.minutes).padStart(2, '0')}m
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Input Panel */}
        <div className="lg:col-span-7 space-y-10">
          <section className="premium-card relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
            
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                    <Zap size={24} />
                 </div>
                 <h3 className="text-3xl font-black uppercase tracking-tighter gradient-text">Simulação de Ataque</h3>
               </div>
               <div className="px-4 py-2 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest opacity-40">v3.0.5 - Strategic</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {/* Meus Dados */}
               <div className="space-y-6">
                 <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-red-500/80">
                   <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Seus Números
                 </div>
                 <div className="space-y-4">
                   <div className="relative group/input">
                     <label className="absolute left-6 top-3 text-[9px] font-black text-text-dim/40 uppercase tracking-widest transition-all group-focus-within/input:text-red-500/60">Posição Atual</label>
                     <input 
                       type="number"
                       value={myRank}
                       onChange={(e) => setMyRank(e.target.value)}
                       className="w-full h-20 bg-bg/40 border border-white/5 rounded-2xl px-6 pt-6 outline-none focus:border-red-500/40 focus:bg-bg/60 transition-all font-black text-2xl tracking-tighter text-white"
                       placeholder="Ex: 5"
                     />
                   </div>
                   <div className="relative group/input">
                     <label className="absolute left-6 top-3 text-[9px] font-black text-text-dim/40 uppercase tracking-widest transition-all group-focus-within/input:text-red-500/60">Sua Pontuação/Views</label>
                     <input 
                       type="number"
                       value={myViews}
                       onChange={(e) => setMyViews(e.target.value)}
                       className="w-full h-20 bg-bg/40 border border-white/5 rounded-2xl px-6 pt-6 outline-none focus:border-red-500/40 focus:bg-bg/60 transition-all font-black text-2xl tracking-tighter text-white shadow-inner"
                       placeholder="0"
                     />
                   </div>
                 </div>
               </div>

               {/* Dados do Alvo */}
               <div className="space-y-6">
                 <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/80">
                   <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Alvo Principal
                 </div>
                 <div className="space-y-4">
                   <div className="grid grid-cols-3 gap-4">
                      <div className="relative group/input col-span-1">
                        <label className="absolute left-6 top-3 text-[9px] font-black text-text-dim/40 uppercase tracking-widest transition-all group-focus-within/input:text-amber-500/60">Pos.</label>
                        <input 
                          type="number"
                          value={leaderRank}
                          onChange={(e) => setLeaderRank(e.target.value)}
                          className="w-full h-20 bg-bg/40 border border-white/5 rounded-2xl px-6 pt-6 outline-none focus:border-amber-500/40 focus:bg-bg/60 transition-all font-black text-2xl tracking-tighter text-white"
                          placeholder="1"
                        />
                      </div>
                      <div className="relative group/input col-span-2">
                        <label className="absolute left-6 top-3 text-[9px] font-black text-text-dim/40 uppercase tracking-widest transition-all group-focus-within/input:text-amber-500/60">Ganho Diário Est.</label>
                        <input 
                          type="number"
                          value={leaderGrowth}
                          onChange={(e) => setLeaderGrowth(e.target.value)}
                          className="w-full h-20 bg-bg/40 border border-white/5 rounded-2xl px-6 pt-6 outline-none focus:border-amber-500/40 focus:bg-bg/60 transition-all font-black text-2xl tracking-tighter text-white"
                          placeholder="Ex: 5000"
                        />
                      </div>
                   </div>
                   <div className="relative group/input">
                     <label className="absolute left-6 top-3 text-[9px] font-black text-text-dim/40 uppercase tracking-widest transition-all group-focus-within/input:text-amber-500/60">Pontuação do Alvo</label>
                     <input 
                       type="number"
                       value={leaderViews}
                       onChange={(e) => setLeaderViews(e.target.value)}
                       className="w-full h-20 bg-bg/40 border border-white/5 rounded-2xl px-6 pt-6 outline-none focus:border-amber-500/40 focus:bg-bg/60 transition-all font-black text-2xl tracking-tighter text-white shadow-inner"
                       placeholder="0"
                     />
                   </div>
                 </div>
               </div>
            </div>

            <button 
              onClick={handleCalculate}
              disabled={!myViews || !leaderViews || calculating}
              className="w-full h-24 mt-12 bg-white text-black rounded-[2.5rem] font-black text-lg uppercase tracking-[0.4em] shadow-glow hover:bg-red-600 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-6 group disabled:opacity-20 disabled:grayscale"
            >
              {calculating ? (
                <Loader2 className="animate-spin" size={32} />
              ) : (
                <>
                  <Sword className="group-hover:-rotate-45 transition-transform duration-500" />
                  INICIAR PROTOCOLO DE ATAQUE
                  <ChevronRight />
                </>
              )}
            </button>
          </section>

          {/* Detailed Result Card */}
          <AnimatePresence>
            {showResult && (
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="premium-card bg-gradient-to-br from-red-600/10 via-surface to-amber-600/10 border-white/10 p-12 overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 scale-150">
                   <Trophy size={200} />
                </div>
                
                <div className="relative z-10 space-y-10">
                   <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-white/5">
                      <div className="text-center md:text-left">
                        <div className="text-[10px] font-black uppercase tracking-[0.5em] text-red-500 mb-2">Trajetória de Ascensão</div>
                        <div className="flex items-center gap-6 text-7xl font-black text-white tracking-tighter italic">
                           <span>{myRank || '?'}º</span>
                           <ArrowUpRight className="text-red-500 animate-pulse" size={40} />
                           <span className="text-amber-500">{leaderRank || '?'}º</span>
                        </div>
                      </div>
                      
                      <div className="text-center md:text-right">
                         <div className="text-4xl font-black text-white mb-1">+{results.totalToOvertake.toLocaleString()}</div>
                         <div className="text-[9px] font-black text-text-dim uppercase tracking-widest opacity-40 italic">Views totais necessárias</div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 group hover:border-red-500/30 transition-all">
                         <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500"><TargetIcon size={16}/></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">Meta Diária Base</span>
                         </div>
                         <div className="text-5xl font-black text-white mb-2">{results.dailyNeeded.toLocaleString()}</div>
                         <p className="text-[9px] font-bold text-text-dim opacity-50">Para ultrapassagem em {results.daysRemaining} dias.</p>
                      </div>

                      <div className="p-8 bg-red-500/10 rounded-[2.5rem] border border-red-500/20 group hover:bg-red-500/20 transition-all shadow-glow">
                         <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white"><ShieldAlert size={16}/></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Protocolo de Segurança (+15%)</span>
                         </div>
                         <div className="text-5xl font-black text-white mb-2">{(results.dailyNeeded + results.safetyBuffer).toLocaleString()}</div>
                         <p className="text-[9px] font-bold text-red-500/60 uppercase tracking-widest">Meta de Dominação Garantida</p>
                      </div>
                   </div>

                   <div className="relative pt-6">
                      <div className="flex justify-between items-center mb-4">
                         <div className="text-[10px] font-black uppercase tracking-widest opacity-50">Sua proximidade do Alvo</div>
                         <div className="text-xs font-black text-accent">{results.progress.toFixed(1)}%</div>
                      </div>
                      <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${results.progress}%` }}
                           className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-accent rounded-full shadow-glow"
                         />
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-5 space-y-8">
           <div className="premium-card !p-10 h-full flex flex-col bg-surface/20 border-white/5">
              <div className="flex items-center justify-between mb-10">
                 <div className="flex items-center gap-4">
                    <History size={24} className="text-text-dim opacity-40" />
                    <h3 className="text-xl font-black uppercase tracking-widest text-white/60 italic">Log de Guerra</h3>
                 </div>
                 <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">{history.length} SALVOS</div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
                 {isLoadingHistory ? (
                   <div className="py-20 flex flex-col items-center gap-4 opacity-20">
                      <RefreshCw className="animate-spin" size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Carregando Nexus...</span>
                   </div>
                 ) : history.length === 0 ? (
                   <div className="py-20 text-center opacity-20 border border-dashed border-white/10 rounded-3xl">
                      <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma simulação registrada</p>
                   </div>
                 ) : (
                   <AnimatePresence mode="popLayout">
                     {history.map((sim) => (
                       <motion.div 
                         key={sim.id}
                         layout
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: -20 }}
                         className="group relative bg-white/[0.03] border border-white/5 p-6 rounded-3xl hover:bg-white/[0.08] hover:border-red-500/20 transition-all cursor-pointer"
                         onClick={() => loadFromHistory(sim)}
                       >
                          <div className="flex justify-between items-start mb-4">
                             <div className="flex items-center gap-3">
                                <div className="text-lg font-black text-white italic">{sim.myRank}º <span className="mx-2 text-text-dim/20">→</span> <span className="text-amber-500">{sim.leaderRank}º</span></div>
                             </div>
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleDelete(sim.id); }}
                               className="p-2 text-text-dim opacity-40 hover:opacity-100 hover:text-red-500 transition-all"
                             >
                                <Trash2 size={16} />
                             </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <div className="text-[8px] font-black text-text-dim/40 uppercase tracking-widest mb-1">Meta Diária</div>
                                <div className="text-sm font-black text-white">{sim.results?.dailyNeeded?.toLocaleString() ?? '—'}</div>
                             </div>
                             <div className="text-right">
                                <div className="text-[8px] font-black text-text-dim/40 uppercase tracking-widest mb-1">Status</div>
                                <div className="text-xs font-black text-accent uppercase">{sim.results?.progress?.toFixed(0) ?? '0'}% SYNC</div>
                             </div>
                          </div>

                          <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-accent opacity-30" style={{ width: `${sim.results?.progress ?? 0}%` }} />
                          </div>
                       </motion.div>
                     ))}
                   </AnimatePresence>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function Loader2({ className, size }: { className?: string, size?: number }) {
  return <RefreshCw className={className} size={size} />;
}
