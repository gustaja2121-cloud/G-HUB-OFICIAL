import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scissors, 
  Plus, 
  TrendingUp, 
  Calendar as CalendarIcon,
  AlertCircle,
  Video,
  Trophy,
  History,
  Activity,
  Trash2,
  FileText,
  Loader2,
  ArrowUp,
  Link as LinkIcon,
  ExternalLink,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO, 
  isSameMonth,
  max
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClipLog, ClipLink } from '../types';
import { cn } from '../lib/utils';
import { useToast } from './Toast';
import { storage } from '../lib/storage';

export default function Cortes() {
  const { showToast } = useToast();
  const [clips, setClips] = useState<ClipLog[]>([]);
  const [clipLinks, setClipLinks] = useState<ClipLink[]>([]);
  const [quantidade, setQuantidade] = useState<string>('');
  const [dataEscolhida, setDataEscolhida] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // Link Manager State
  const [linkTitle, setLinkTitle] = useState('');
  const [rawUrl, setRawUrl] = useState('');
  const [editedUrl, setEditedUrl] = useState('');
  const [linkStatus, setLinkStatus] = useState<ClipLink['status']>('ideia');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data via subscription
  useEffect(() => {
    const unsubscribeClips = storage.subscribeClips((data) => {
      setClips(data);
    });
    
    const unsubscribeLinks = storage.subscribeClipLinks((data) => {
      setClipLinks(data);
      setLoading(false);
    });

    return () => {
      unsubscribeClips();
      unsubscribeLinks();
    };
  }, []);

  const handleAddLink = async () => {
    if (!linkTitle) {
      showToast('O título é obrigatório');
      return;
    }

    try {
      await storage.saveClipLink({
        id: Math.random().toString(36).substring(2, 9),
        title: linkTitle,
        rawUrl,
        editedUrl,
        status: linkStatus,
        createdAt: new Date().toISOString()
      });
      
      showToast('Link arquivado com sucesso!');
      setLinkTitle('');
      setRawUrl('');
      setEditedUrl('');
      setLinkStatus('ideia');
    } catch (e) {
      showToast('Erro ao salvar link');
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      await storage.deleteClipLink(id);
      showToast('Link removido');
    } catch (e) {
      showToast('Erro ao remover link');
    }
  };

  const updateLinkStatus = async (link: ClipLink, status: ClipLink['status']) => {
    try {
      await storage.saveClipLink({ ...link, status });
      showToast(`Status atualizado para ${status}`);
    } catch (e) {
      showToast('Erro ao atualizar status');
    }
  };

  const handleAddClips = async () => {
    const num = parseInt(quantidade);
    
    if (!quantidade || isNaN(num) || num <= 0) {
      setError('A quantidade deve ser maior que 0');
      return;
    }

    if (!dataEscolhida) {
      setError('Escolha uma data válida');
      return;
    }

    setError(null);
    
    const existingIndex = clips.findIndex(c => c.data === dataEscolhida);

    try {
      if (existingIndex > -1) {
        const updatedClip = { ...clips[existingIndex] };
        updatedClip.quantidade += num;
        await storage.saveClip(updatedClip);
      } else {
        await storage.saveClip({ 
          id: Math.random().toString(36).substring(2, 9),
          data: dataEscolhida, 
          quantidade: num 
        });
      }

      showToast('Registro adicionado com sucesso!');
      setQuantidade('');
    } catch (e) {
      console.error('Erro ao salvar clip:', e);
      showToast('Erro ao salvar no banco de dados');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await storage.deleteClip(id);
      showToast('Registro removido com sucesso');
    } catch (e) {
      console.error('Erro ao deletar clip:', e);
      showToast('Erro ao remover do banco de dados');
    }
  };

  // Calculations
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  
  const monthlyClips = clips.filter(c => {
    const date = parseISO(c.data);
    return isSameMonth(date, new Date());
  });

  const totalMonth = monthlyClips.reduce((acc, curr) => acc + curr.quantidade, 0);

  const selectedDayTotal = clips.find(c => c.data === dataEscolhida)?.quantidade || 0;

  const maxClipDay = monthlyClips.length > 0 
    ? [...monthlyClips].sort((a, b) => b.quantidade - a.quantidade)[0]
    : null;

  // Chart Data Preparation (Current Month)
  const daysInMonth = eachDayOfInterval({
    start: currentMonthStart,
    end: currentMonthEnd
  });

  const chartData = daysInMonth.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const record = clips.find(c => c.data === dayStr);
    return {
      day: format(day, 'dd'),
      fullDate: dayStr,
      quantidade: record ? record.quantidade : 0
    };
  });

  const maxValue = Math.max(...chartData.map(d => d.quantidade), 5);

  // Sorted list for display (most recent date first)
  const sortedClips = [...clips].sort((a, b) => b.data.localeCompare(a.data));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="text-accent animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24 pt-10">
      {/* Header & Registration */}
      <motion.header 
        layoutId="cortes-header"
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-surface border border-white/5 p-10 rounded-5xl relative overflow-hidden shadow-premium"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-red-500 to-accent animate-pulse opacity-40 shadow-glow" />
        
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-accent rounded-3xl flex items-center justify-center text-white border border-white/10 shadow-2xl shadow-accent/20">
            <Scissors size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter leading-none mb-2 gradient-text">IMPLANTAÇÃO DE ARQUÉTIPOS</h1>
            <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] flex items-center gap-3 italic opacity-60">
              <Activity size={14} className="text-accent" /> Controle de Sistema Ativo
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-6 bg-white/[0.02] p-8 rounded-4xl border border-white/5 shadow-inner">
          <div className="flex flex-col gap-2.5 w-full sm:w-auto">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim ml-1 opacity-50 text-white">Unidades</label>
             <input
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="00"
                className={cn(
                  "h-14 w-full sm:w-32 bg-bg border px-6 rounded-2xl font-black text-white transition-all outline-none text-center text-xl placeholder:opacity-20",
                  error ? "border-red-500/50 focus:border-red-500" : "border-white/5 focus:border-accent shadow-lg"
                )}
             />
          </div>

          <div className="flex flex-col gap-2.5 w-full sm:w-auto">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim ml-1 opacity-50 text-white">Data do Registro</label>
             <input
                type="date"
                value={dataEscolhida}
                onChange={(e) => setDataEscolhida(e.target.value)}
                className="h-14 w-full sm:w-48 bg-bg border border-white/5 px-6 rounded-2xl font-black text-white transition-all outline-none uppercase text-xs shadow-lg"
             />
          </div>

          <div className="pt-6 w-full sm:w-auto">
            <button
              onClick={handleAddClips}
              className="h-14 w-full px-10 bg-accent text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-accent/20 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center gap-3 group whitespace-nowrap interactive-button"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
              Sincronizar
            </button>
          </div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute top-4 right-12 flex items-center gap-1.5 text-[10px] text-red-500 font-black uppercase tracking-[0.1em]"
            >
              <AlertCircle size={14} /> {error}
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* Metrics Row */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        {/* Metric: Selected Day */}
        <div className="premium-card group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-text-dim group-hover:bg-accent/10 group-hover:text-accent transition-all border border-white/5">
                <History size={24} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-text-dim italic opacity-60">
                {format(parseISO(dataEscolhida), "dd.MM", { locale: ptBR })}
              </span>
            </div>
            <div className="text-7xl font-black tracking-tighter leading-none mb-3">{selectedDayTotal.toString().padStart(2, '0')}</div>
            <div className="text-[11px] font-black uppercase tracking-[0.3em] text-text-dim opacity-60">Registro de Ciclo</div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rotate-12">
            <CalendarIcon size={140} />
          </div>
        </div>

        {/* Metric: Month Total */}
        <div className="premium-card group border-accent/10">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent border border-accent/20">
                <TrendingUp size={24} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-accent italic">Dominância</span>
            </div>
            <div className="text-7xl font-black tracking-tighter leading-none mb-3 text-white">{totalMonth.toString().padStart(2, '0')}</div>
            <div className="text-[11px] font-black uppercase tracking-[0.3em] text-text-dim opacity-60">Volume Mensal</div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
            <Video size={140} />
          </div>
        </div>

        {/* Metric: Best Day */}
        <div className="premium-card group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-text-dim group-hover:bg-yellow-500/10 group-hover:text-yellow-400 transition-all border border-white/5">
                <Trophy size={24} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-text-dim italic opacity-60">Pico de Nexus</span>
            </div>
            <div className="text-7xl font-black tracking-tighter leading-none mb-3">
              {maxClipDay ? maxClipDay.quantidade.toString().padStart(2, '0') : '00'}
            </div>
            <div className="text-[11px] font-black uppercase tracking-[0.3em] text-text-dim opacity-60 flex items-center gap-2">
              <div className="indicator-up text-[9px]"><ArrowUp size={8} /> RECORDE {maxClipDay ? format(parseISO(maxClipDay.data), 'dd/MM') : '--'}</div>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <TrendingUp size={140} />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Modern Area Chart Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 premium-card flex flex-col relative overflow-hidden p-12"
        >
          <div className="flex items-center justify-between mb-16">
            <div>
              <h3 className="text-3xl font-black uppercase tracking-tighter gradient-text">Pulso de Desempenho</h3>
              <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] opacity-60">Evolução de Dados do Ciclo</p>
            </div>
            <div className="h-4 w-24 bg-white/5 rounded-full relative overflow-hidden">
               <motion.div 
                 initial={{ x: "-100%" }}
                 animate={{ x: "100%" }}
                 transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 w-1/2 bg-accent/40 blur-md"
               />
            </div>
          </div>

          <div className="h-[380px] w-full -ml-8 -mb-6 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="clipGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E63946" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#E63946" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="8 8" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  stroke="#4a4a4a" 
                  fontSize={11} 
                  fontWeight={900}
                  tickLine={false} 
                  axisLine={false} 
                  dy={15}
                  interval={2}
                />
                <YAxis hide domain={[0, maxValue + 2]} />
                <Tooltip
                  cursor={{ stroke: '#E63946', strokeWidth: 2, strokeDasharray: '4 4' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-surface/90 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl shadow-premium relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 w-full h-1 bg-accent shadow-glow" />
                          <p className="text-[10px] font-black text-text-dim uppercase mb-4 tracking-[0.2em] opacity-60">
                            POSTAGEM: {format(parseISO(data.fullDate), "dd.MM.yyyy")}
                          </p>
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg">
                               <Video size={24} />
                            </div>
                            <div>
                               <div className="text-4xl font-black text-white leading-none">{data.quantidade}</div>
                               <div className="text-[10px] font-black uppercase text-accent tracking-[0.3em] mt-1.5 italic">Sincronizado</div>
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
                  fillOpacity={1}
                  fill="url(#clipGradient)"
                  animationDuration={2500}
                />
                {maxClipDay && (
                  <ReferenceLine 
                    y={maxClipDay.quantidade} 
                    stroke="#E63946" 
                    strokeDasharray="4 4" 
                    strokeWidth={1}
                    opacity={0.3}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Registrations List */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="premium-card flex flex-col gap-8 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-text-dim border border-white/5">
                 <FileText size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter gradient-text">Log de Sincronia</h3>
                <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] opacity-40 italic">Terminal de Registros</p>
              </div>
            </div>
            {sortedClips.length > 0 && (
               <div className="px-4 py-1.5 glass rounded-full text-[10px] font-black text-accent shadow-sm border border-white/5">
                  REDE: {sortedClips.length}
               </div>
            )}
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[420px] pr-3 custom-scrollbar">
            {sortedClips.length === 0 ? (
              <div className="py-20 border border-dashed border-white/5 rounded-4xl flex flex-col items-center justify-center gap-6 text-text-dim bg-white/[0.01]">
                <Activity size={48} className="opacity-10 animate-pulse" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em] italic text-center px-10 opacity-40">Aguardando Conexão de Arquivamento Primário</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {sortedClips.map((clip, idx) => (
                  <motion.div
                    key={clip.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 flex items-center justify-between group hover:border-accent/30 hover:bg-white/[0.04] transition-all shadow-lg"
                  >
                    <div className="flex items-center gap-5">
                       <div className="w-14 h-14 bg-bg rounded-2xl flex flex-col items-center justify-center border border-white/5 group-hover:border-accent/20 transition-colors shadow-inner">
                          <span className="text-[9px] font-black text-accent uppercase">{format(parseISO(clip.data), "MMM", { locale: ptBR })}</span>
                          <span className="text-xl font-black text-white">{format(parseISO(clip.data), "dd")}</span>
                       </div>
                       <div>
                          <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.15em] opacity-50 mb-1">{format(parseISO(clip.data), "yyyy")}</div>
                          <div className="text-xl font-black text-white leading-none">{clip.quantidade} <span className="text-[10px] text-accent font-black uppercase tracking-wider ml-1 italic">Confirmado</span></div>
                       </div>
                    </div>
                    <button
                      onClick={() => handleDelete(clip.id)}
                      className="w-12 h-12 bg-accent/5 text-accent rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-white transition-all shadow-xl hover:shadow-accent/40 interactive-button"
                      title="Desativar Registro"
                    >
                      <Trash2 size={20} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
          
          <div className="mt-auto pt-6 border-t border-white/5">
             <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[0.3em] text-text-dim opacity-40 italic">
                <span>Integridade do Sistema:</span>
                <span className="text-accent opacity-100">Sincronizado</span>
             </div>
          </div>
        </motion.div>
      </div>

      {/* Video Link Manager Section */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
            <LinkIcon size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter gradient-text">Gerenciador de Ativos</h2>
            <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] opacity-60">Arquivamento de Vídeos e Links</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Form Card */}
          <div className="xl:col-span-1 premium-card space-y-6">
            <div className="space-y-4">
               <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Título do Vídeo</label>
                 <input 
                   type="text" 
                   value={linkTitle}
                   onChange={e => setLinkTitle(e.target.value)}
                   placeholder="Ex: Flow Podcast #15"
                   className="h-12 bg-bg border border-white/5 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-accent transition-all"
                 />
               </div>
               
               <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Link Bruto (Drive/Raw)</label>
                 <input 
                   type="url" 
                   value={rawUrl}
                   onChange={e => setRawUrl(e.target.value)}
                   placeholder="https://drive.google.com/..."
                   className="h-12 bg-bg border border-white/5 rounded-xl px-4 text-xs font-mono text-white/60 outline-none focus:border-accent transition-all"
                 />
               </div>

               <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Link Editado (Final)</label>
                 <input 
                   type="url" 
                   value={editedUrl}
                   onChange={e => setEditedUrl(e.target.value)}
                   placeholder="https://youtube.com/..."
                   className="h-12 bg-bg border border-white/5 rounded-xl px-4 text-xs font-mono text-white/60 outline-none focus:border-accent transition-all"
                 />
               </div>

               <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Status Operacional</label>
                 <select 
                   value={linkStatus}
                   onChange={e => setLinkStatus(e.target.value as any)}
                   className="h-12 bg-bg border border-white/5 rounded-xl px-4 text-[10px] font-black uppercase text-white outline-none focus:border-accent transition-all appearance-none cursor-pointer"
                 >
                   <option value="ideia">Ideia</option>
                   <option value="editando">Editando</option>
                   <option value="pronto">Pronto</option>
                   <option value="postado">Postado</option>
                 </select>
               </div>
            </div>

            <button 
              onClick={handleAddLink}
              className="w-full h-14 bg-accent text-white rounded-xl font-black uppercase tracking-[0.2em] text-[11px] shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Arquivar Vídeo
            </button>
          </div>

          {/* List Card */}
          <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {clipLinks.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((link) => (
                <motion.div
                  key={link.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="premium-card group relative flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border",
                        link.status === 'postado' ? "bg-green-500/10 border-green-500/20 text-green-400" :
                        link.status === 'pronto' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                        link.status === 'editando' ? "bg-accent/10 border-accent/20 text-accent" :
                        "bg-white/5 border-white/10 text-text-dim"
                      )}>
                        {link.status === 'postado' ? <CheckCircle2 size={20} /> : <Video size={20} />}
                      </div>
                      <div>
                        <h4 className="text-lg font-black uppercase tracking-tight text-white group-hover:text-accent transition-colors">{link.title}</h4>
                        <p className="text-[9px] font-black text-text-dim uppercase tracking-widest opacity-40">{format(parseISO(link.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-2 text-text-dim hover:text-accent opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <a 
                      href={link.rawUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className={cn(
                        "flex items-center justify-center gap-2 h-10 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest transition-all",
                        link.rawUrl ? "bg-white/5 text-white hover:bg-white/10" : "opacity-20 cursor-not-allowed"
                      )}
                    >
                      Bruto <ExternalLink size={12} />
                    </a>
                    <a 
                      href={link.editedUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className={cn(
                        "flex items-center justify-center gap-2 h-10 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest transition-all",
                        link.editedUrl ? "bg-accent/10 border-accent/20 text-accent hover:bg-accent/20" : "opacity-20 cursor-not-allowed"
                      )}
                    >
                      Final <ExternalLink size={12} />
                    </a>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      {['ideia', 'editando', 'pronto', 'postado'].map((s) => (
                        <button
                          key={s}
                          onClick={() => updateLinkStatus(link, s as any)}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            link.status === s ? "bg-accent scale-150 shadow-glow" : "bg-white/10 hover:bg-white/30"
                          )}
                          title={s.toUpperCase()}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent italic">{link.status}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {clipLinks.length === 0 && (
              <div className="md:col-span-2 py-20 border border-dashed border-white/5 rounded-4xl flex flex-col items-center justify-center gap-4 text-text-dim">
                <LinkIcon size={40} className="opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Nenhum vídeo arquivado no sistema</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>

  );
}
