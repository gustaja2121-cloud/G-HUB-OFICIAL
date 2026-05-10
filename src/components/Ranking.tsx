import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Sword, 
  Zap, 
  Timer, 
  Flame, 
  ChevronRight,
  History,
  Trash2,
  Target as TargetIcon,
  ShieldAlert,
  Loader2,
  ArrowUpRight
} from 'lucide-react';
import { addDays, endOfWeek, setHours, setMinutes, setSeconds } from 'date-fns';
import { storage } from '../lib/storage';
import { RankingSimulation } from '../types';
import { useToast } from './Toast';
import { useAuth } from '../lib/AuthContext';

export default function Ranking() {
  const { showToast } = useToast();
  const { user } = useAuth();
  
  // Inputs
  const [myRank, setMyRank] = useState<string>('');
  const [myViews, setMyViews] = useState<string>('');
  const [leaderRank, setLeaderRank] = useState<string>('');
  const [leaderViews, setLeaderViews] = useState<string>('');
  const [leaderGrowth, setLeaderGrowth] = useState<string>('');
  
  // UI State
  const [calculating, setCalculating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState<RankingSimulation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Countdown Logic
  const getNextSunday = () => {
    const now = new Date();
    let target = endOfWeek(now, { weekStartsOn: 1 });
    target = setHours(target, 23);
    target = setMinutes(target, 59);
    target = setSeconds(target, 59);
    if (now > target) target = addDays(target, 7);
    return target;
  };

  const [targetDate, setTargetDate] = useState(getNextSunday());
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const currentNow = new Date();
      setNow(currentNow);
      if (currentNow > targetDate) setTargetDate(getNextSunday());
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  // Sync History
  useEffect(() => {
    if (!user) return;
    
    setIsLoadingHistory(true);
    const unsub = storage.subscribeRankings((data) => {
      setHistory(data);
      setIsLoadingHistory(false);
    });

    const handleError = (e: any) => {
      const { error, path, operation } = e.detail;
      showToast(`Acesso Arena [${operation}]: ${error}`, 'error');
      setIsLoadingHistory(false);
    };
    window.addEventListener('firestore-error', handleError);
    
    return () => {
      unsub();
      window.removeEventListener('firestore-error', handleError);
    };
  }, [user]);

  // Calculation Logic
  const results = useMemo(() => {
    const mine = parseFloat(myViews) || 0;
    const leader = parseFloat(leaderViews) || 0;
    const lGrowth = parseFloat(leaderGrowth) || 0;
    const diff = Math.max(0, leader - mine);
    
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
      showToast('Preencha os números obrigatórios', 'error');
      return;
    }
    
    setCalculating(true);
    try {
      const simulation = {
        myRank, myViews, leaderRank, leaderViews, leaderGrowth,
        results,
        date: new Date().toISOString()
      };

      await storage.saveRanking(simulation);
      setShowResult(true);
      showToast('Estratégia de Ataque Sincronizada', 'success');
    } catch (e: any) {
      console.error('Erro Arena:', e);
      try {
        const parsed = JSON.parse(e.message);
        showToast(`Erro Arena [${parsed.operationType}]: ${parsed.error}`, 'error');
      } catch {
        showToast('Falha na conexão com o Nexus', 'error');
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Remover registro de guerra?')) {
      try {
        await storage.deleteRanking(id);
        showToast('Registro eliminado');
      } catch (e) {
        showToast('Erro ao remover registro', 'error');
      }
    }
  };

  const countdown = useMemo(() => {
    const diffMs = targetDate.getTime() - now.getTime();
    const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const h = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { d, h, m };
  }, [targetDate, now]);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 pt-10 px-4 md:px-0">
      {/* Header Section */}
      <header className="relative overflow-hidden rounded-[3rem] bg-surface/40 backdrop-blur-3xl border border-white/5 p-12 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-amber-500/10" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-gradient-to-tr from-red-600 to-amber-500 rounded-3xl flex items-center justify-center text-white shadow-xl">
              <Sword size={40} />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tighter leading-none mb-2 uppercase italic">
                ARENA <span className="text-red-500">NEXUS</span>
              </h1>
              <div className="flex items-center gap-3 text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">
                <Flame size={14} className="text-red-500" /> Protocolo de Dominação v2
              </div>
            </div>
          </div>
          <div className="bg-black/40 border border-white/5 p-6 rounded-3xl text-center">
            <div className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">Ciclo de Guerra Finaliza em:</div>
            <div className="text-3xl font-black font-mono text-white tracking-widest">
              {countdown.d}d {String(countdown.h).padStart(2, '0')}h {String(countdown.m).padStart(2, '0')}m
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Inputs */}
        <div className="lg:col-span-7 space-y-10">
          <section className="premium-card">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                <Zap size={20} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter">Parâmetros de Batalha</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* My Numbers */}
              <div className="space-y-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-red-500/60">Seus Números</div>
                <div className="space-y-4">
                  <div className="relative group/input">
                    <label className="absolute left-5 top-2.5 text-[8px] font-black text-text-dim opacity-40 uppercase">Sua Posição</label>
                    <input 
                      type="number" value={myRank} onChange={e => setMyRank(e.target.value)}
                      className="w-full h-16 bg-bg/40 border border-white/5 rounded-2xl px-5 pt-5 font-black text-xl outline-none focus:border-red-500/40 transition-all"
                      placeholder="Ex: 5"
                    />
                  </div>
                  <div className="relative group/input">
                    <label className="absolute left-5 top-2.5 text-[8px] font-black text-text-dim opacity-40 uppercase">Suas Views</label>
                    <input 
                      type="number" value={myViews} onChange={e => setMyViews(e.target.value)}
                      className="w-full h-16 bg-bg/40 border border-white/5 rounded-2xl px-5 pt-5 font-black text-xl outline-none focus:border-red-500/40 transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Leader Numbers */}
              <div className="space-y-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-500/60">Alvo Principal</div>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="relative group/input flex-1">
                      <label className="absolute left-5 top-2.5 text-[8px] font-black text-text-dim opacity-40 uppercase">Posição</label>
                      <input 
                        type="number" value={leaderRank} onChange={e => setLeaderRank(e.target.value)}
                        className="w-full h-16 bg-bg/40 border border-white/5 rounded-2xl px-5 pt-5 font-black text-xl outline-none focus:border-amber-500/40 transition-all"
                        placeholder="1"
                      />
                    </div>
                    <div className="relative group/input flex-[2]">
                      <label className="absolute left-5 top-2.5 text-[8px] font-black text-text-dim opacity-40 uppercase">Ganho Diário</label>
                      <input 
                        type="number" value={leaderGrowth} onChange={e => setLeaderGrowth(e.target.value)}
                        className="w-full h-16 bg-bg/40 border border-white/5 rounded-2xl px-5 pt-5 font-black text-xl outline-none focus:border-amber-500/40 transition-all"
                        placeholder="Ex: 5000"
                      />
                    </div>
                  </div>
                  <div className="relative group/input">
                    <label className="absolute left-5 top-2.5 text-[8px] font-black text-text-dim opacity-40 uppercase">Views do Alvo</label>
                    <input 
                      type="number" value={leaderViews} onChange={e => setLeaderViews(e.target.value)}
                      className="w-full h-16 bg-bg/40 border border-white/5 rounded-2xl px-5 pt-5 font-black text-xl outline-none focus:border-amber-500/40 transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleCalculate}
              disabled={calculating || !myViews || !leaderViews}
              className="w-full h-20 mt-10 bg-white text-black rounded-3xl font-black text-sm uppercase tracking-[0.4em] hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-4 disabled:opacity-10"
            >
              {calculating ? <Loader2 className="animate-spin" /> : <>INICIAR ATAQUE <ChevronRight size={18} /></>}
            </button>
          </section>

          {/* Results Display */}
          <AnimatePresence>
            {showResult && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="premium-card bg-gradient-to-br from-red-600/5 to-amber-600/5 border-white/10"
              >
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-10 pb-8 border-b border-white/5">
                  <div className="text-center md:text-left">
                    <div className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-2">Meta de Ultrapassagem</div>
                    <div className="text-6xl font-black text-white flex items-center gap-4">
                      {myRank}º <ArrowUpRight className="text-red-500" /> {leaderRank}º
                    </div>
                  </div>
                  <div className="text-center md:text-right">
                    <div className="text-4xl font-black text-white">+{results.totalToOvertake.toLocaleString()}</div>
                    <div className="text-[9px] font-black text-text-dim uppercase opacity-40">Views Totais Faltantes</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-black/20 rounded-3xl border border-white/5">
                    <div className="text-[10px] font-black uppercase text-text-dim mb-4 tracking-widest">Meta Diária Base</div>
                    <div className="text-4xl font-black text-white">{results.dailyNeeded.toLocaleString()}</div>
                    <p className="text-[9px] font-bold text-text-dim mt-1 opacity-50">Ciclo de {results.daysRemaining} dias restantes.</p>
                  </div>
                  <div className="p-6 bg-red-500/10 rounded-3xl border border-red-500/20">
                    <div className="text-[10px] font-black uppercase text-red-500 mb-4 tracking-widest">Meta de Segurança (+15%)</div>
                    <div className="text-4xl font-black text-white">{(results.dailyNeeded + results.safetyBuffer).toLocaleString()}</div>
                    <p className="text-[9px] font-bold text-red-500 opacity-50 uppercase">Dominação Garantida</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar History */}
        <div className="lg:col-span-5">
          <div className="premium-card !p-8 h-full flex flex-col bg-surface/20">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <History className="opacity-40" size={20} />
                <h3 className="text-lg font-black uppercase tracking-widest opacity-60">Log de Guerra</h3>
              </div>
              <div className="text-[10px] font-black text-red-500">{history.length} SALVOS</div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
              {isLoadingHistory ? (
                <div className="py-10 text-center opacity-20"><Loader2 className="animate-spin mx-auto mb-2" /> Carregando...</div>
              ) : history.length === 0 ? (
                <div className="py-20 text-center opacity-10 border border-dashed border-white/10 rounded-3xl">Nenhum registro</div>
              ) : (
                history.map(sim => (
                  <motion.div 
                    key={sim.id} layout
                    className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-red-500/20 transition-all cursor-pointer relative group"
                    onClick={() => {
                      setMyRank(sim.myRank); setMyViews(sim.myViews);
                      setLeaderRank(sim.leaderRank); setLeaderViews(sim.leaderViews);
                      setLeaderGrowth(sim.leaderGrowth); setShowResult(true);
                    }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-black text-white italic">{sim.myRank}º <span className="text-red-500 mx-1">→</span> {sim.leaderRank}º</div>
                      <button onClick={e => handleDelete(e, sim.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex justify-between text-[9px] font-black uppercase opacity-40">
                      <span>Meta: {sim.results?.dailyNeeded?.toLocaleString() ?? 0}</span>
                      <span>{sim.results?.progress?.toFixed(0)}% SYNC</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
