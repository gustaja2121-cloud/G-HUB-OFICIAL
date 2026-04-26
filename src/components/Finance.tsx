import { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { FinanceEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';
import { 
  Plus, 
  DollarSign, 
  Trash2, 
  TrendingUp, 
  Calendar as CalendarIcon,
  X,
  CreditCard,
  Target,
  Wallet,
  ArrowUpRight,
  Filter,
  Sparkles,
  Loader2,
  ArrowDownRight,
  Activity,
  ChevronDown,
  Lock
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameMonth, subDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip,
  CartesianGrid
} from 'recharts';

export default function Finance({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const loadData = async () => {
    try {
      const data = await storage.getFinance();
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return;

    const entry: FinanceEntry = {
      id: crypto.randomUUID(),
      amount: parseFloat(amount),
      description: description || 'Capital Inflow',
      date,
    };
    await storage.saveFinance(entry);
    await loadData();
    setIsModalOpen(false);
    setAmount('');
    setDescription('');
    showToast('Depósito sincronizado com sucesso!', 'success');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('De-initialize this transaction?')) {
      await storage.deleteFinance(id);
      await loadData();
      showToast('Transação removida.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="text-accent animate-spin" size={40} />
    </div>
  );

  // Metrics
  const totalGeneral = entries.reduce((acc, curr) => acc + curr.amount, 0);
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const currentMonthEntries = entries.filter(e => {
    const entryDate = new Date(e.date);
    return entryDate >= monthStart && entryDate <= monthEnd;
  });
  const totalMonthly = currentMonthEntries.reduce((acc, curr) => acc + curr.amount, 0);
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const totalToday = entries.filter(e => e.date === todayStr)
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Daily Evolution Chart (Last 14 days)
  const chartData = Array.from({ length: 14 }).map((_, i) => {
    const d = subDays(new Date(), 13 - i);
    const dayStr = format(d, 'yyyy-MM-dd');
    const dayTotal = entries
      .filter(e => e.date === dayStr)
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    return {
      date: format(d, 'dd/MM'),
      valor: dayTotal,
      fullDate: dayStr
    };
  });

  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const groupedByDay = sortedEntries.reduce((acc, entry) => {
    const day = entry.date;
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {} as Record<string, FinanceEntry[]>);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 pt-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-surface/30 backdrop-blur-3xl border border-white/5 p-10 rounded-5xl">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-accent rounded-4xl flex items-center justify-center text-white shadow-2xl shadow-accent/40 border border-white/10">
            <Wallet size={40} />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter leading-none mb-3 gradient-text uppercase">Nexus Financeiro</h1>
            <div className="flex items-center gap-4">
               <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] opacity-60 italic">Gestão Estratégica de Ativos</p>
               <div className="w-px h-3 bg-white/10" />
               <div className="flex items-center gap-1.5 text-[10px] font-black text-green-500 uppercase tracking-widest">
                  <Activity size={12} /> Livro Razão em Tempo Real
               </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-16 bg-accent text-white px-10 rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-2xl shadow-accent/30 group interactive-button"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          Injetar Capital
        </button>
      </header>

      {/* High-Impact Asset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           className="premium-card group relative p-10 border-l-4 border-accent"
        >
          <div className="absolute top-8 right-8 w-14 h-14 bg-accent/5 rounded-2xl flex items-center justify-center text-accent ring-1 ring-white/5 group-hover:bg-accent group-hover:text-white transition-all transform group-hover:rotate-12">
            <DollarSign size={28} />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 opacity-60">Valor Acumulado de Ativos</div>
            <div className="text-5xl font-black tracking-tighter text-white mb-2">R$ {totalGeneral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className="indicator-up text-[10px]"><TrendingUp size={10} /> +12.4% Eficiência de Estratégia</div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
        </motion.div>

        <motion.div
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.1 }}
           className="premium-card group relative p-10 border-l-4 border-blue-500"
        >
          <div className="absolute top-8 right-8 w-14 h-14 bg-blue-500/5 rounded-2xl flex items-center justify-center text-blue-500 ring-1 ring-white/5 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <TrendingUp size={28} />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 opacity-60">Desempenho do Ciclo</div>
            <div className="text-5xl font-black tracking-tighter text-white mb-2">R$ {totalMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/60 italic">Sincronização Mensal Ativa</div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
        </motion.div>

        <motion.div
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2 }}
           className="premium-card group relative p-10 border-l-4 border-green-500"
        >
          <div className="absolute top-8 right-8 w-14 h-14 bg-green-500/5 rounded-2xl flex items-center justify-center text-green-500 ring-1 ring-white/5 group-hover:bg-green-500 group-hover:text-white transition-all">
            <ArrowUpRight size={28} />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 opacity-60">Entrada Imediata</div>
            <div className="text-5xl font-black tracking-tighter text-white mb-2">R$ {totalToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500/60 italic flex items-center gap-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Registro Diário Online
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Performance Architecture */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-12"
          >
            <div className="flex items-center justify-between mb-16">
              <div>
                <h2 className="text-3xl font-black tracking-tighter gradient-text uppercase mb-2">Velocidade Alpha</h2>
                <p className="text-[10px] font-black text-text-dim tracking-[0.4em] uppercase opacity-40">Trajetória Financeira de 14 Ciclos</p>
              </div>
              <div className="flex gap-4">
                 <div className="px-6 py-2.5 bg-white/5 border border-white/5 rounded-full flex items-center gap-3 text-[10px] font-black text-accent uppercase tracking-widest">
                    <Sparkles size={14} className="animate-pulse" />
                    Pulso Estratégico
                 </div>
              </div>
            </div>

            <div className="h-[380px] w-full -ml-8 -mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E63946" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#E63946" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="8 8" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#4a4a4a" 
                    fontSize={11} 
                    fontWeight={900}
                    tickLine={false} 
                    axisLine={false}
                    dy={15}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ stroke: '#E63946', strokeWidth: 2, strokeDasharray: '4 4' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-surface/90 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-premium relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-full h-1 bg-accent shadow-glow" />
                            <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] mb-3 opacity-60">Registro: {payload[0].payload.date}</div>
                            <div className="text-3xl font-black text-white leading-none">R$ {payload[0].value?.toLocaleString('pt-BR')}</div>
                            <div className="text-[9px] font-black text-accent uppercase tracking-[0.3em] mt-2 italic flex items-center gap-2">
                               <ArrowUpRight size={10} /> Entrada Verificada
                            </div>
                          </motion.div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="#E63946" 
                    strokeWidth={5}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    animationDuration={2500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Ledger Architecture */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
              <CalendarIcon size={24} className="text-accent" />
              Diário
            </h2>
            <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] opacity-40 italic">{entries.length} Nós</div>
          </div>

          <div className="space-y-10 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
            {Object.keys(groupedByDay).length === 0 ? (
              <div className="premium-card border-dashed p-20 text-center opacity-40">
                <DollarSign size={48} className="mx-auto mb-8 opacity-20" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em] italic px-10 leading-relaxed">Nenhuma entrada de ativos estratégicos detectada no nexus de armazenamento local.</p>
              </div>
            ) : (
              Object.keys(groupedByDay).sort((a, b) => b.localeCompare(a)).map((day) => {
                const dayEntries = groupedByDay[day];
                return (
                  <div key={day} className="space-y-5">
                    <div className="flex items-center gap-5 px-4">
                      <div className="h-[2px] w-8 bg-accent shadow-glow" />
                      <span className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] italic">
                        {format(new Date(day + 'T12:00:00'), "dd.MMMM", { locale: ptBR })}
                      </span>
                      <div className="h-[2px] flex-1 bg-white/5" />
                    </div>
                    
                    <div className="space-y-4">
                      {dayEntries.map((entry, idx) => (
                        <motion.div 
                          key={entry.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="premium-card p-6 flex items-center justify-between group interactive-button hover:bg-white/[0.03]"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-bg flex items-center justify-center text-accent border border-white/5 group-hover:border-accent/40 shadow-inner">
                              <CreditCard size={22} />
                            </div>
                            <div>
                              <div className="text-base font-black text-white uppercase tracking-tight truncate max-w-[140px] mb-1">{entry.description}</div>
                              <div className="text-lg font-black text-accent leading-none">R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => handleDelete(entry.id, e)}
                            className="w-10 h-10 bg-accent/5 text-accent rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-white transition-all shadow-xl interactive-button"
                          >
                            <Trash2 size={18} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Asset Injection Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-3xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-surface border border-white/10 w-full max-w-lg rounded-[4rem] p-12 relative z-10 shadow-premium"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-text-dim hover:text-white hover:bg-accent/10 transition-all"
              >
                <X size={26} />
              </button>

              <div className="flex flex-col items-center text-center gap-6 mb-12">
                <div className="w-16 h-16 bg-accent/10 rounded-3xl flex items-center justify-center text-accent ring-1 ring-accent/30 shadow-glow">
                  <ArrowUpRight size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter gradient-text leading-none mb-3">Registro de Ativos</h2>
                  <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.5em] opacity-40">Sincronizando Livro Razão Local</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim ml-4 opacity-50">Valor da Transação</label>
                  <div className="relative">
                    <span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-accent text-3xl">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      autoFocus
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full h-24 bg-bg border-2 border-white/5 rounded-[2.5rem] pl-20 pr-10 outline-none focus:border-accent text-4xl font-black transition-all placeholder:opacity-10 shadow-inner"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim ml-4 opacity-50">Descrição de Identidade</label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="INSIRA A ORIGEM DO PROTOCOLO"
                    className="w-full h-16 bg-bg border border-white/5 rounded-2xl px-8 outline-none focus:border-accent font-black uppercase tracking-widest text-sm transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim ml-4 opacity-50">Carimbo de Tempo do Nexus</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-16 bg-bg border border-white/5 rounded-2xl px-8 outline-none focus:border-accent font-black uppercase text-xs transition-all shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-20 bg-white text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.5em] hover:bg-white/90 transition-all shadow-2xl active:scale-[0.98] mt-6 interactive-button"
                >
                  Autorizar Injeção
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
