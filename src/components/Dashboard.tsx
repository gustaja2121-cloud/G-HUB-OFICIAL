import { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { PerformanceState, DailyChecklistTask, FinanceEntry, VideoPostRecord } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  Legend
} from 'recharts';
import { 
  TrendingUp,
  Calendar,
  CheckCircle,
  Layout,
  Plus,
  ArrowRight,
  ShieldAlert,
  Zap,
  CircleCheck,
  CircleDashed,
  Lightbulb,
  Loader2,
  DollarSign,
  Activity,
  Trophy,
  Target,
  Clock,
  User,
  History,
  ArrowUpRight,
  FileText,
  Video,
  BarChart as ChartBar,
  ArrowUp
} from 'lucide-react';
import { format, subDays, isSameDay, startOfMonth, endOfMonth, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { useToast } from './Toast';

export default function Dashboard({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const { showToast } = useToast();
  const [perf, setPerf] = useState<PerformanceState | null>(null);
  const [dailyTasks, setDailyTasks] = useState<DailyChecklistTask[]>([]);
  const [finance, setFinance] = useState<FinanceEntry[]>([]);
  const [videoHistory, setVideoHistory] = useState<VideoPostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [p, d, f] = await Promise.all([
        storage.getPerformance(),
        storage.getDailyChecklist(),
        storage.getFinance(),
      ]);
      setPerf(p);
      setDailyTasks(d);
      setFinance(f);

      // Load Video Performance from Firestore
      const vh = await storage.getVideoPerformance();
      setVideoHistory(vh);
    } catch (error) {
      console.error('Falha ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Setup Real-time Listeners
    const unsubFinance = storage.subscribeFinance(setFinance);
    const unsubPerf = storage.subscribePerformance(setPerf);
    const unsubVideo = storage.subscribeVideoPerformance(setVideoHistory);

    return () => {
      unsubFinance();
      unsubPerf();
      unsubVideo();
    };
  }, []);

  const handleRegisterVideoPost = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = videoHistory.find(v => v.data === today);
    
    try {
      if (existing) {
        await storage.saveVideoPerformance({ 
          ...existing, 
          quantidade: existing.quantidade + 1 
        });
      } else {
        await storage.saveVideoPerformance({ 
          data: today, 
          quantidade: 1 
        });
      }

      showToast('Registro processado com sucesso!', 'success');
      // Also add some XP
      await storage.addXP(50);
    } catch (e) {
      console.error('Erro ao registrar postagem:', e);
      showToast('Erro ao sincronizar registro', 'error');
    }
  };

  const toggleDailyTask = async (id: string) => {
    const updated = dailyTasks.map(t => {
      if (t.id === id) {
        const newState = !t.completed;
        return { ...t, completed: newState };
      }
      return t;
    });
    
    setDailyTasks(updated);
    await storage.saveDailyChecklist(updated);
    
    const newPerf = await storage.getPerformance();
    setPerf(newPerf);
  };

  if (loading || !perf) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full"
      />
    </div>
  );

  const currentXp = perf.xp;
  const levelXp = perf.level * 1000;
  const xpPercent = Math.min((currentXp / levelXp) * 100, 100);

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthlyFinance = finance
    .filter(e => {
      const d = new Date(e.date);
      return d >= monthStart && d <= monthEnd;
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  const getStrategicAdvice = () => {
    return { title: "Nexus Operacional", desc: "Monitore seu fluxo financeiro e postagens.", tab: 'finance' };
  };

  const evolutionData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayFinance = finance.filter(f => isSameDay(new Date(f.date), date));
    const financeScore = dayFinance.length * 20;
    const dayFinanceTotal = dayFinance.reduce((acc, curr) => acc + curr.amount, 0);

    return {
      name: format(date, 'dd/MM'),
      score: financeScore,
      finance: dayFinance.length,
      financeAmount: dayFinanceTotal
    };
  });

  const totalAtivos = finance.length;

  // Video Performance Calculations
  const todayVideos = videoHistory.find(v => v.data === format(new Date(), 'yyyy-MM-dd'))?.quantidade || 0;
  const yesterdayVideos = videoHistory.find(v => v.data === format(subDays(new Date(), 1), 'yyyy-MM-dd'))?.quantidade || 0;
  
  const monthVideos = videoHistory
    .filter(v => isSameMonth(parseISO(v.data), new Date()))
    .reduce((acc, curr) => acc + curr.quantidade, 0);
  
  const bestDay = videoHistory.length > 0 
    ? [...videoHistory].sort((a, b) => b.quantidade - a.quantidade)[0]
    : null;

  const videoChartData = Array.from({ length: 14 }).map((_, i) => {
    const d = subDays(new Date(), 13 - i);
    const dayStr = format(d, 'yyyy-MM-dd');
    const record = videoHistory.find(v => v.data === dayStr);
    return {
      name: format(d, 'dd/MM'),
      quantidade: record ? record.quantidade : 0
    };
  });

  const correlationData = Array.from({ length: 14 }).map((_, i) => {
    const d = subDays(new Date(), 13 - i);
    const dayStr = format(d, 'yyyy-MM-dd');
    
    // Finance for this day
    const dayFinance = finance.filter(f => isSameDay(new Date(f.date), d))
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    // Videos for this day
    const dayVideos = videoHistory.find(v => v.data === dayStr)?.quantidade || 0;

    return {
      name: format(d, 'dd/MM'),
      faturamento: dayFinance,
      postagens: dayVideos
    };
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 transition-all duration-500 pb-20 pt-10">
      {/* Premium Header */}
      <motion.header 
        layoutId="header"
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-surface border border-white/5 p-10 rounded-5xl relative overflow-hidden shadow-premium"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-red-400 to-accent animate-pulse opacity-40 shadow-glow" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-2">
            <div className="w-16 h-16 bg-accent rounded-3xl flex items-center justify-center text-white border border-white/10 shadow-2xl shadow-accent/20">
              <TrendingUp size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter leading-none mb-2 gradient-text">CENTRO OPERATIVO</h1>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-text-dim">Protocolo Ativo</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-accent italic">Sequência de {perf.streak} Dias</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 min-w-[340px]">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-text-dim opacity-60">Nível Arquiteto</span>
              <div className="text-3xl font-black text-white">{perf.level.toString().padStart(2, '0')}</div>
            </div>
            <div className="text-right space-y-1">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-text-dim opacity-60">Progresso Sync</span>
              <div className="text-sm font-mono text-accent font-bold uppercase tracking-widest">{currentXp} <span className="opacity-30">/ {levelXp}</span></div>
            </div>
          </div>
          <div className="h-5 w-full bg-bg border border-white/5 rounded-full p-1 relative overflow-hidden group">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${xpPercent}%` }}
               className="h-full bg-gradient-to-r from-accent to-red-500 rounded-full shadow-glow relative overflow-hidden"
             >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_2s_infinite]" />
             </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Bento Grid Architecture */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
      >
        {/* Metric: Revenue Analysis */}
        <motion.div variants={itemVariants} className="lg:col-span-2 premium-card flex flex-col justify-between group">
          <div className="flex justify-between items-start relative z-10">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-text-dim group-hover:bg-green-500/10 group-hover:text-green-400 transition-all border border-white/5">
              <DollarSign size={24} />
            </div>
            <button onClick={() => onNavigate('finance')} className="text-[11px] font-black uppercase text-accent tracking-[0.3em] hover:underline flex items-center gap-2 group interactive-button">
              Explorador Financeiro <ArrowRight size={14} className="group-hover:translate-x-1 transition-all" />
            </button>
          </div>
          <div className="mt-10 relative z-10">
            <div className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] mb-2 opacity-60 italic">Rendimento Mensal</div>
            <div className="text-6xl font-black tracking-tighter leading-none mb-1">R$ {monthlyFinance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className="indicator-up mt-2">
               <ArrowUp size={12} /> <span className="uppercase tracking-widest text-[9px]">Dominância Ativa</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 h-full w-48 opacity-[0.08] pointer-events-none group-hover:opacity-[0.15] transition-opacity">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={evolutionData.slice(-5)}>
                  <Bar dataKey="financeAmount" fill="#E63946" radius={[6, 6, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Metric: Performance Ecosystem */}
        <motion.div variants={itemVariants} className="lg:col-span-1 premium-card flex flex-col justify-between group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-text-dim mb-8 group-hover:bg-accent/10 group-hover:text-accent transition-all border border-white/5">
              <Activity size={24} />
            </div>
            <div className="text-6xl font-black tracking-tighter mb-2 uppercase leading-none">{perf.streak.toString().padStart(2, '0')}</div>
            <div className="text-[11px] font-black uppercase tracking-[0.3em] text-text-dim opacity-60">Dias Seguidores</div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rotate-12">
            <Zap size={140} />
          </div>
        </motion.div>

        {/* Metric: Level Architecture */}
        <motion.div variants={itemVariants} className="lg:col-span-1 premium-card flex flex-col justify-between group">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-text-dim mb-8 group-hover:bg-red-500/10 group-hover:text-red-400 transition-all border border-white/5">
              <Trophy size={24} />
            </div>
            <div className="text-6xl font-black tracking-tighter mb-2 uppercase leading-none">{perf.level.toString().padStart(2, '0')}</div>
            <div className="text-[11px] font-black uppercase tracking-[0.3em] text-text-dim opacity-60">Nível Operacional</div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity -rotate-12">
            <TrendingUp size={140} />
          </div>
        </motion.div>

        {/* Checkpoint Architecture */}
        <motion.div variants={itemVariants} className="lg:col-span-2 premium-card flex flex-col gap-10 border-accent/10">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-1 gradient-text">Checkpoint Operacional</h3>
              <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] opacity-60">Pulso Estratégico: {format(new Date(), "dd.MM.yyyy", { locale: ptBR })}</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="text-[10px] font-black text-accent uppercase tracking-[0.4em] glow-text">{(dailyTasks.filter(t => t.completed).length/(dailyTasks.length || 1) * 100).toFixed(0)}%</div>
               <div className="w-32 h-2 bg-white/5 border border-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(dailyTasks.filter(t => t.completed).length/(dailyTasks.length || 1) * 100)}%` }}
                    className="h-full bg-accent shadow-glow" 
                  />
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative z-10">
            {dailyTasks.map(task => (
              <button
                key={task.id}
                onClick={() => toggleDailyTask(task.id)}
                className={cn(
                  "flex flex-col gap-5 p-7 rounded-3xl border transition-all text-left relative overflow-hidden group interactive-button",
                  task.completed 
                    ? "bg-accent/5 border-accent/20 text-accent shadow-glow" 
                    : "bg-white/[0.02] border-white/5 text-text-dim hover:border-accent/30 hover:bg-white/[0.04]"
                )}
              >
                <div className="flex justify-between items-center relative z-10">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-colors", task.completed ? "border-accent/30 bg-accent/10" : "border-white/5 bg-white/5")}>
                    {task.type === 'post' ? <TrendingUp size={18} /> : task.type === 'edit' ? <FileText size={18} /> : <Lightbulb size={18} />}
                  </div>
                  {task.completed ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CircleCheck size={22} className="text-accent" /></motion.div>
                  ) : (
                    <CircleDashed size={22} className="opacity-30 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <div className="relative z-10">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1.5">{task.type === 'post' ? 'Protocolo' : task.type === 'edit' ? 'Produção' : 'Design'}</div>
                  <div className={cn("text-sm font-black uppercase tracking-tight leading-tight", task.completed && "opacity-50")}>{task.title}</div>
                </div>
              </button>
            ))}
          </div>

          <button 
            onClick={() => {
              const advice = getStrategicAdvice();
              // @ts-ignore
              onNavigate(advice.tab);
            }}
            className="w-full h-24 bg-accent text-white rounded-4xl flex items-center justify-between px-10 group relative overflow-hidden shadow-2xl shadow-accent/20 interactive-button"
          >
            <div className="flex items-center gap-6 relative z-10">
               <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
                 <Lightbulb size={24} className="fill-white" />
               </div>
               <div className="flex flex-col items-start leading-none gap-2">
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80 flex items-center gap-2">Implantação Estratégica <Activity size={12} /></span>
                 <span className="text-xl font-black uppercase tracking-tighter">{getStrategicAdvice().title}</span>
               </div>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all">
              <ArrowRight size={24} className="group-hover:translate-x-1.5 transition-transform" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </motion.div>

        {/* Video Performance Ecosystem */}
        <motion.div variants={itemVariants} className="lg:col-span-2 premium-card flex flex-col gap-10 group">
          <div className="flex items-center justify-between relative z-10">
             <div>
               <h3 className="text-2xl font-black uppercase tracking-tighter gradient-text">Evolução dos Arquétipos</h3>
               <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] opacity-60">Desempenho de postagens (14 dias)</p>
             </div>
             <div className="flex flex-col items-end gap-1">
                <div className="px-4 py-1.5 glass rounded-full text-[10px] font-black text-white hover:text-accent transition-colors cursor-default">
                  Ciclo: {monthVideos.toString().padStart(2, '0')}
                </div>
                <div className="indicator-up text-[10px] opacity-80">
                  <ArrowUpRight size={14} /> Pico: {bestDay?.quantidade || 0}
                </div>
             </div>
          </div>
          
          <div className="h-[260px] w-full mt-auto -ml-8 -mb-4 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={videoChartData}>
                <defs>
                  <linearGradient id="videoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E63946" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#E63946" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="10 10" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="#4a4a4a" fontSize={11} fontWeight={900} tickLine={false} axisLine={false} dy={15} />
                <YAxis stroke="#404040" fontSize={10} tickLine={false} axisLine={false} dx={-10} allowDecimals={false} hide />
                <Tooltip 
                  cursor={{ stroke: '#E63946', strokeWidth: 2, strokeDasharray: '4 4' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-surface/90 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-premium relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
                          <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-3">{label}</p>
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white">
                                <Video size={20} />
                             </div>
                             <div>
                               <div className="text-3xl font-black text-white leading-none">{payload[0].value}</div>
                               <div className="text-[9px] font-black uppercase text-accent tracking-widest mt-1">Postagens Confirmadas</div>
                             </div>
                          </div>
                        </motion.div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="quantidade" 
                  stroke="#E63946" 
                  strokeWidth={5} 
                  strokeLinecap="round" 
                  fill="url(#videoGradient)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="absolute -right-10 -top-10 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity rotate-[-15deg]">
            <Video size={220} />
          </div>
        </motion.div>

        {/* Video Pulse Registry */}
        <motion.div variants={itemVariants} className="lg:col-span-2 premium-card flex flex-col md:flex-row items-center gap-10 bg-gradient-to-br from-surface to-[#1a1a1a]">
          <div className="relative group/btn">
             <div className="absolute inset-0 bg-accent rounded-full blur-2xl opacity-20 group-hover/btn:opacity-40 transition-opacity" />
             <button 
                onClick={handleRegisterVideoPost}
                className="w-32 h-32 rounded-full bg-accent border-4 border-white/10 flex items-center justify-center text-white shadow-premium relative z-10 interactive-button"
              >
                <Plus size={48} className="transition-transform group-hover/btn:rotate-90 duration-500" />
             </button>
             <div className="absolute top-0 right-0 px-3 py-1 bg-white text-black rounded-full text-[9px] font-black uppercase tracking-tighter -mr-2 -mt-1 shadow-xl">Postar</div>
          </div>
          
          <div className="flex-1 space-y-6">
             <div>
                <h4 className="text-2xl font-black uppercase tracking-tighter gradient-text">Sincronização de Dados</h4>
                <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] opacity-60">Arquivamento automático em tempo real</p>
             </div>
             <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                   <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-1">Hoje</div>
                   <div className="text-3xl font-black text-white">{todayVideos.toString().padStart(2, '0')}</div>
                   <div className={cn("text-[9px] font-bold mt-1 flex items-center gap-1", todayVideos >= yesterdayVideos ? "text-green-400" : "text-accent")}>
                      {todayVideos >= yesterdayVideos ? <ArrowUp size={8} /> : <ArrowUp className="rotate-180" size={8} />}
                      {todayVideos === 0 && yesterdayVideos === 0 ? "Inicial" : `${Math.abs(todayVideos - yesterdayVideos)} diff`}
                   </div>
                </div>
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                   <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-1">Recorde</div>
                   <div className="text-3xl font-black text-white">{bestDay?.quantidade.toString().padStart(2, '0') || '00'}</div>
                   <div className="text-[9px] font-black text-accent uppercase tracking-[0.2em] mt-1">{bestDay ? format(parseISO(bestDay.data), 'dd/MM') : 'Nexus'}</div>
                </div>
             </div>
          </div>
        </motion.div>

        {/* Global Performance Pulse */}
        <motion.div variants={itemVariants} className="lg:col-span-2 premium-card flex flex-col gap-10 bg-gradient-to-tr from-surface to-bg">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-accent">
                <ShieldAlert size={28} />
                <h4 className="text-2xl font-black uppercase tracking-tighter gradient-text">Check de Rede Neural</h4>
              </div>
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-ping" />
                <div className="w-1.5 h-1.5 bg-accent rounded-full opacity-50" />
                <div className="w-1.5 h-1.5 bg-accent rounded-full opacity-20" />
              </div>
          </div>
          <p className="text-2xl font-black leading-tight uppercase tracking-tighter text-white/90 italic">
             "O sucesso estratégico exige persistência absoluta no deploy de conteúdo."
          </p>
          <div className="flex flex-wrap items-center gap-8 py-6 border-y border-white/5">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent"><Zap size={20} /></div>
                <div>
                   <div className="text-[9px] font-black text-text-dim uppercase tracking-[0.3em]">Sequência</div>
                   <div className="text-xl font-black text-white">{perf.streak} Dias</div>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent"><TrendingUp size={20} /></div>
                <div>
                   <div className="text-[9px] font-black text-text-dim uppercase tracking-[0.3em]">Ranking</div>
                   <div className="text-xl font-black text-white">Arquiteto Avançado</div>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent"><Activity size={20} /></div>
                <div>
                   <div className="text-[9px] font-black text-text-dim uppercase tracking-[0.3em]">Ganho XP</div>
                   <div className="text-xl font-black text-white">+{currentXp} unidades</div>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-text-dim uppercase tracking-[0.4em] opacity-40">
             Sincronização de Protocolo Completa <CheckCircle size={10} /> {format(new Date(), "HH:mm:ss")}
          </div>
        </motion.div>

        {/* Strategic Correlation Chart (Idea 3) */}
        <motion.div variants={itemVariants} className="lg:col-span-4 premium-card flex flex-col gap-10 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3 text-accent mb-2">
                <ChartBar size={24} />
                <h3 className="text-3xl font-black uppercase tracking-tighter gradient-text">Correlação Estratégica</h3>
              </div>
              <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] opacity-60">Visão de ROI: Esforço de Postagem vs. Retorno Financeiro</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-xl">
                 <div className="w-2 h-2 bg-accent rounded-full" />
                 <span className="text-[10px] font-black uppercase text-white tracking-widest">Esforço (Cortes)</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                 <div className="w-2 h-2 bg-green-500 rounded-full" />
                 <span className="text-[10px] font-black uppercase text-white tracking-widest">Retorno (R$)</span>
              </div>
            </div>
          </div>

          <div className="h-[400px] w-full mt-auto relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={correlationData}>
                <defs>
                  <linearGradient id="effortGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E63946" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E63946" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="10 10" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis dataKey="name" stroke="#4a4a4a" fontSize={11} fontWeight={900} tickLine={false} axisLine={false} dy={15} />
                <YAxis yAxisId="left" hide />
                <YAxis yAxisId="right" orientation="right" hide />
                <Tooltip 
                  cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 40 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-surface/95 backdrop-blur-3xl border border-white/10 p-6 rounded-3xl shadow-premium min-w-[240px]">
                          <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-4 border-b border-white/5 pb-2">{label}</p>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center text-accent"><Video size={16} /></div>
                                <span className="text-[10px] font-black uppercase text-text-dim">Postagens</span>
                              </div>
                              <span className="text-xl font-black text-white">{payload[0].value}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center text-green-500"><DollarSign size={16} /></div>
                                <span className="text-[10px] font-black uppercase text-text-dim">Receita</span>
                              </div>
                              <span className="text-xl font-black text-green-400">R$ {payload[1].value.toLocaleString('pt-BR')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="postagens" 
                  fill="url(#effortGrad)" 
                  stroke="#E63946" 
                  strokeWidth={4}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="faturamento" 
                  stroke="#22c55e" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#22c55e', strokeWidth: 2, stroke: '#121212' }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.div>
    </div>

  );
}
