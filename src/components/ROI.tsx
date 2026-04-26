import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  TrendingUp, 
  Target, 
  DollarSign, 
  ArrowRight, 
  Activity, 
  Zap, 
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Coins,
  BarChart3,
  Lightbulb,
  Sparkles,
  PieChart
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Bar,
  Cell
} from 'recharts';
import { storage } from '../lib/storage';
import { FinanceEntry, VideoPostRecord } from '../types';
import { cn } from '../lib/utils';
import { useToast } from './Toast';
import { subDays, format, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ROI() {
  const { showToast } = useToast();
  const [finance, setFinance] = useState<FinanceEntry[]>([]);
  const [videoHistory, setVideoHistory] = useState<VideoPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Simulation State
  const [targetRevenue, setTargetRevenue] = useState<string>('5000');
  const [costs, setCosts] = useState<string>('0');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [f, v] = await Promise.all([
          storage.getFinance(),
          storage.getVideoPerformance()
        ]);
        setFinance(f);
        setVideoHistory(v);
      } catch (error) {
        console.error('Erro ao carregar dados de ROI:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    const unsubFinance = storage.subscribeFinance(setFinance);
    const unsubVideo = storage.subscribeVideoPerformance(setVideoHistory);

    return () => {
      unsubFinance();
      unsubVideo();
    };
  }, []);

  // Calculations
  const totalRevenue = finance.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPosts = videoHistory.reduce((acc, curr) => acc + curr.quantidade, 0);
  
  const revenuePerPost = totalPosts > 0 ? totalRevenue / totalPosts : 0;
  
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  
  const monthFinance = finance
    .filter(f => {
      const d = new Date(f.date);
      return d >= currentMonthStart && d <= currentMonthEnd;
    })
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const monthPosts = videoHistory
    .filter(v => {
      const d = new Date(v.data);
      return d >= currentMonthStart && d <= currentMonthEnd;
    })
    .reduce((acc, curr) => acc + curr.quantidade, 0);

  const monthRevenuePerPost = monthPosts > 0 ? monthFinance / monthPosts : 0;

  // Simulation
  const numericTarget = parseFloat(targetRevenue) || 0;
  const numericCosts = parseFloat(costs) || 0;
  const postsNeeded = monthRevenuePerPost > 0 
    ? Math.ceil((numericTarget + numericCosts) / monthRevenuePerPost) 
    : 0;

  // Chart Data: Last 14 days ROI
  const chartData = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => {
      const date = subDays(new Date(), 13 - i);
      const dayStr = format(date, 'yyyy-MM-dd');
      
      const dayFinance = finance
        .filter(f => isSameDay(new Date(f.date), date))
        .reduce((acc, curr) => acc + curr.amount, 0);
        
      const dayPosts = videoHistory.find(v => v.data === dayStr)?.quantidade || 0;
      const dayROI = dayPosts > 0 ? dayFinance / dayPosts : 0;

      return {
        name: format(date, 'dd/MM'),
        roi: dayROI,
        faturamento: dayFinance,
        postagens: dayPosts
      };
    });
  }, [finance, videoHistory]);

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

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <Loader2 className="text-amber-500 animate-spin" size={48} />
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-500 animate-pulse">Sincronizando Algoritmo de ROI...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 pt-10 font-sans">
      {/* Header Premium */}
      <header className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-transparent blur-2xl opacity-50 transition-opacity group-hover:opacity-100" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-10 bg-surface/40 backdrop-blur-3xl border border-white/5 p-12 rounded-[3.5rem] shadow-premium">
          <div className="flex items-center gap-8">
            <div className="relative">
              <div className="absolute -inset-4 bg-amber-500/20 blur-xl rounded-full animate-pulse" />
              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl border border-white/10 relative overflow-hidden group/icon">
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10" />
                <Calculator size={44} className="relative z-10 group-hover/icon:scale-110 transition-transform duration-500" />
              </div>
            </div>
            <div>
              <h1 className="text-6xl font-black tracking-tighter leading-none mb-4 uppercase italic">
                <span className="text-white">ROI</span> <span className="text-amber-500">Inteligente</span>
              </h1>
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-2 text-[11px] font-black text-text-dim uppercase tracking-[0.4em] opacity-60">
                   <Activity size={14} className="text-amber-500" /> Protocolo de Lucratividade
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <div className="text-[11px] font-black text-amber-500 uppercase tracking-[0.4em]">
                   Eficiência: {monthRevenuePerPost > 0 ? "Alta" : "Aguardando Dados"}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="px-8 py-5 bg-white/5 border border-white/5 rounded-3xl text-right">
              <div className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1">Média p/ Vídeo</div>
              <div className="text-3xl font-black text-amber-500">R$ {monthRevenuePerPost.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        <motion.div variants={itemVariants} className="premium-card bg-gradient-to-br from-surface to-amber-900/10 border-amber-500/10">
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shadow-glow">
              <Coins size={24} />
            </div>
            <div className="indicator-up">
              <ArrowUpRight size={14} /> Ativo
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] opacity-40">Valor de Mercado/Corte</div>
            <div className="text-5xl font-black text-white tracking-tighter">R$ {revenuePerPost.toFixed(2)}</div>
            <p className="text-[11px] font-bold text-text-dim italic mt-4 opacity-60">Baseado em {totalPosts} vídeos históricos</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="premium-card bg-gradient-to-br from-surface to-green-900/10 border-green-500/10">
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500">
              <Target size={24} />
            </div>
            <div className="px-3 py-1 bg-green-500/20 rounded-full text-green-400 text-[9px] font-black uppercase tracking-widest">Meta</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] opacity-40">Faturamento Mensal</div>
            <div className="text-5xl font-black text-white tracking-tighter">R$ {monthFinance.toFixed(2)}</div>
            <div className="h-2 w-full bg-white/5 rounded-full mt-6 overflow-hidden">
               <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((monthFinance / (numericTarget || 1)) * 100, 100)}%` }}
                className="h-full bg-green-500 shadow-glow" 
               />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="premium-card bg-gradient-to-br from-surface to-red-900/10 border-red-500/10">
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
              <Zap size={24} />
            </div>
            <div className="px-3 py-1 bg-red-500/20 rounded-full text-red-400 text-[9px] font-black uppercase tracking-widest">Esforço</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] opacity-40">Vídeos Postados (Mês)</div>
            <div className="text-5xl font-black text-white tracking-tighter">{monthPosts} <span className="text-lg opacity-30">UN</span></div>
            <p className="text-[11px] font-bold text-text-dim italic mt-4 opacity-60">Ritmo atual: {(monthPosts / (new Date().getDate())).toFixed(1)} vídeos/dia</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Simulator Section */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 premium-card flex flex-col gap-10 bg-surface/60"
        >
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-2 gradient-text">Simulador de Metas</h3>
            <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] opacity-60 italic">Planejamento de Expansão de Lucro</p>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim ml-4 opacity-60">Meta de Faturamento (R$)</label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-500"><DollarSign size={20} /></div>
                <input 
                  type="number"
                  value={targetRevenue}
                  onChange={(e) => setTargetRevenue(e.target.value)}
                  className="w-full h-16 bg-bg/50 border border-white/5 rounded-3xl pl-16 pr-8 outline-none focus:border-amber-500 transition-all font-black text-lg tracking-tighter"
                  placeholder="Ex: 10000"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim ml-4 opacity-60">Custos Operacionais (R$)</label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-red-400"><PieChart size={20} /></div>
                <input 
                  type="number"
                  value={costs}
                  onChange={(e) => setCosts(e.target.value)}
                  className="w-full h-16 bg-bg/50 border border-white/5 rounded-3xl pl-16 pr-8 outline-none focus:border-red-500 transition-all font-black text-lg tracking-tighter"
                  placeholder="Ex: 200"
                />
              </div>
            </div>

            <div className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-[2.5rem] relative overflow-hidden group hover:bg-amber-500/10 transition-all">
               <div className="relative z-10">
                 <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.5em] mb-4">Plano de Execução</div>
                 <div className="flex items-end gap-3">
                    <div className="text-5xl font-black text-white">{postsNeeded}</div>
                    <div className="text-[10px] font-black uppercase text-text-dim tracking-widest mb-2 opacity-60">Vídeos p/ Mês</div>
                 </div>
                 <p className="text-xs font-bold text-text-dim mt-6 leading-relaxed opacity-80">
                   Para atingir R$ {numericTarget.toLocaleString()} líquidos, você precisa manter o ritmo e postar cerca de **{Math.ceil(postsNeeded / 30)} vídeos por dia**.
                 </p>
               </div>
               <div className="absolute -right-6 -bottom-6 text-amber-500/10 group-hover:scale-110 transition-transform">
                 <Target size={120} />
               </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 premium-card flex flex-col gap-10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-black uppercase tracking-tighter mb-2 gradient-text">Tendência de Lucratividade</h3>
              <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] opacity-60 italic">Valor gerado por vídeo nos últimos 14 dias</p>
            </div>
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-text-dim"><BarChart3 size={24} /></div>
          </div>

          <div className="h-[380px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="10 10" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis dataKey="name" stroke="#4a4a4a" fontSize={11} fontWeight={900} tickLine={false} axisLine={false} dy={15} />
                <YAxis stroke="#404040" fontSize={10} tickLine={false} axisLine={false} dx={-10} hide />
                <Tooltip 
                  cursor={{ stroke: 'rgba(255,191,0,0.1)', strokeWidth: 40 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-surface/95 backdrop-blur-3xl border border-white/10 p-6 rounded-3xl shadow-premium min-w-[240px]">
                          <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-4 border-b border-white/5 pb-2">{label}</p>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-text-dim">Média p/ Vídeo</span>
                              <span className="text-xl font-black text-amber-500">R$ {payload[0].value.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold text-white/40">
                               <span>Faturamento</span>
                               <span>R$ {payload[1].value.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="roi" 
                  fill="url(#roiGrad)" 
                  stroke="#f59e0b" 
                  strokeWidth={4}
                />
                <Bar dataKey="faturamento" fill="rgba(255,255,255,0.03)" radius={[10, 10, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </section>

      {/* Strategic Insights */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-card bg-gradient-to-r from-amber-500/10 via-surface to-bg border-amber-500/20 p-12"
      >
        <div className="flex flex-col md:flex-row items-center gap-12">
           <div className="w-32 h-32 bg-amber-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-amber-500/40 relative shrink-0">
              <Lightbulb size={60} className="relative z-10" />
              <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] animate-ping opacity-20" />
           </div>
           <div className="space-y-6">
              <div className="flex items-center gap-3 text-amber-500">
                <Sparkles size={24} />
                <h4 className="text-2xl font-black uppercase tracking-tighter">Insights do Nexus para ROI</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                    <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Otimização de Tempo</div>
                    <p className="text-sm font-bold text-white/80 leading-relaxed italic">
                      "Se você reduzir o tempo de edição em 10% mantendo a qualidade, seu ROI por hora sobe de R$ {(revenuePerPost * 0.9).toFixed(2)} para R$ {revenuePerPost.toFixed(2)} efetivos."
                    </p>
                 </div>
                 <div className="space-y-2">
                    <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Escalabilidade</div>
                    <p className="text-sm font-bold text-white/80 leading-relaxed italic">
                      "Com a média atual de **R$ {monthRevenuePerPost.toFixed(2)} por vídeo**, contratar um editor que custe menos que isso por vídeo já é lucrativo no primeiro dia."
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
