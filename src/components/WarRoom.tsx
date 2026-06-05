import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../lib/storage';
import { WarRoomPostLog, WarRoomConfig } from '../types';
import { useToast } from './Toast';
import { format, differenceInDays, isSameDay, eachDayOfInterval, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, Clock, Rocket, Calendar, Trash2, Hourglass, Plus, X, Users, Zap, History, BarChart3, Play, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';

export default function WarRoom() {
  const { showToast } = useToast();
  
  const [logs, setLogs] = useState<WarRoomPostLog[]>([]);
  const [config, setConfig] = useState<WarRoomConfig | null>(null);
  
  const [timerMinutes, setTimerMinutes] = useState(60); 
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Config Form
  const [compName, setCompName] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [dailyTarget, setDailyTarget] = useState(9);
  
  // Accounts
  const [accountsList, setAccountsList] = useState<{ id: string; platform: string; handle: string; }[]>([]);
  const [newAccPlatform, setNewAccPlatform] = useState('TikTok');
  const [newAccHandle, setNewAccHandle] = useState('');

  const safeDate = (dString: string) => {
    const d = new Date(dString);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const loadData = async () => {
    const loadedLogs = await storage.getWarRoomLogs();
    const validLogs = (loadedLogs || []).filter(Boolean);
    setLogs(validLogs);
    
    const loadedConfig = await storage.getWarRoomConfig();
    if (loadedConfig) {
      setConfig(loadedConfig);
      setCompName((loadedConfig as any).compName || '');
      setStartDate(loadedConfig.startDate || format(new Date(), 'yyyy-MM-dd'));
      setEndDate(loadedConfig.endDate || format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
      setDailyTarget(loadedConfig.dailyTarget || 9);
      setAccountsList((loadedConfig.accounts || []).filter(Boolean));
    }
    
    if (validLogs.length > 0) {
      const latestLog = validLogs[0];
      const lastPostTime = new Date(latestLog.postedAt).getTime();
      const now = Date.now();
      const elapsed = now - lastPostTime;
      const durationMs = (latestLog.timerDurationMinutes || 60) * 60 * 1000;
      if (elapsed < durationMs) {
        setTimeLeft(Math.floor((durationMs - elapsed) / 1000));
      } else {
        setTimeLeft(0);
      }
    } else {
      setTimeLeft(0);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = async () => {
    const newConfig = { startDate, endDate, dailyTarget, accounts: accountsList, compName } as any;
    await storage.saveWarRoomConfig(newConfig);
    setConfig(newConfig);
    showToast('Configurações salvas!', 'success');
  };

  const handleAddAccount = () => {
    if (!newAccHandle) return;
    const updated = [...accountsList, { id: crypto.randomUUID(), platform: newAccPlatform, handle: newAccHandle }];
    setAccountsList(updated);
    setNewAccHandle('');
  };

  const handleRemoveAccount = (id: string) => {
    setAccountsList(prev => prev.filter(a => a.id !== id));
  };

  const handlePostVideo = async (acc: { id: string; platform: string; handle: string; }) => {
    const now = new Date().toISOString();
    await storage.saveWarRoomLog({
      platform: acc.platform,
      account: acc.handle,
      postedAt: now,
      timerDurationMinutes: timerMinutes
    } as any);
    showToast(`Postado em ${acc.handle}!`, 'success');
    loadData();
  };

  const handleDeleteLog = async (id: string) => {
    await storage.deleteWarRoomLog(id);
    showToast('Registro apagado!', 'success');
    loadData();
  };

  // Cálculos
  const logsToday = logs.filter(l => l.postedAt && isSameDay(safeDate(l.postedAt), new Date()));

  const getLogsForAccountToday = (handle: string) => 
    logsToday.filter(l => l.account === handle);

  const totalDays = config ? Math.max(1, differenceInDays(safeDate(config.endDate), safeDate(config.startDate)) + 1) : 1;
  const daysPassed = config ? Math.max(0, differenceInDays(new Date(), safeDate(config.startDate))) : 0;

  // Gráfico: dados por dia
  const chartData = useMemo(() => {
    if (!config || !config.startDate || !config.endDate) return [];
    try {
      const start = safeDate(config.startDate);
      const end = safeDate(config.endDate);
      if (end < start) return [];
      
      const days = eachDayOfInterval({ start, end });
      return days.map(day => {
        const dayLogs = logs.filter(l => l.postedAt && isSameDay(safeDate(l.postedAt), day));
        return {
          date: day,
          label: format(day, 'dd/MM', { locale: ptBR }),
          dayName: format(day, 'EEE', { locale: ptBR }),
          count: dayLogs.length,
          isToday: isSameDay(day, new Date()),
          isPast: day < startOfDay(new Date()),
          logs: dayLogs
        };
      });
    } catch {
      return [];
    }
  }, [logs, config]);

  const maxCount = Math.max(config?.dailyTarget || 9, ...chartData.map(d => d.count), 1);

  // Histórico agrupado por dia
  const historyByDay = useMemo(() => {
    const groups: Record<string, WarRoomPostLog[]> = {};
    logs.forEach(l => {
      if (!l.postedAt) return;
      const key = format(safeDate(l.postedAt), 'yyyy-MM-dd');
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10);
  }, [logs]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 pt-10">

      {/* ====== HEADER ====== */}
      <header className="flex items-center gap-6 bg-surface/30 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem]">
        <div className="w-20 h-20 bg-accent rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-2xl shadow-accent/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-accent animate-pulse opacity-50" />
          <Target size={36} className="relative z-10" />
        </div>
        <div>
          <h1 className="text-5xl font-black tracking-tighter leading-none mb-2 gradient-text uppercase">
            War Room
          </h1>
          <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] opacity-60 italic">
            Central de Operações e Monitoramento
          </p>
        </div>
      </header>

      {/* ====== LINHA 1: COMPETIÇÃO + TIMER | CONTAS SALVAS ====== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* COLUNA ESQUERDA: COMPETIÇÃO + TIMER */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* DADOS DA COMPETIÇÃO */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />
            <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center gap-2">
              <Trophy size={14} className="text-accent" /> Dados da Competição
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Nome da Competição</label>
                <input
                  type="text"
                  placeholder="Ex: Desafio Sertanejo"
                  value={compName}
                  onChange={e => setCompName(e.target.value)}
                  className="w-full h-12 bg-black/30 border border-white/10 rounded-xl px-4 text-sm font-black text-white placeholder:text-white/20 outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Início</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-10 bg-black/30 border border-white/10 rounded-xl px-3 text-[10px] text-white outline-none focus:border-accent" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Fim</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-10 bg-black/30 border border-white/10 rounded-xl px-3 text-[10px] text-white outline-none focus:border-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Vídeos/Dia</label>
                  <input type="number" value={dailyTarget} onChange={e => setDailyTarget(Number(e.target.value))} className="w-full h-10 bg-black/30 border border-white/10 rounded-xl px-3 text-sm font-black text-white outline-none focus:border-accent text-center" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-dim uppercase tracking-widest flex items-center gap-1">
                    <Hourglass size={10} className="text-accent" /> Timer (min)
                  </label>
                  <input type="number" min="1" value={timerMinutes} onChange={e => setTimerMinutes(Number(e.target.value))} className="w-full h-10 bg-black/30 border border-white/10 rounded-xl px-3 text-sm font-black text-white outline-none focus:border-accent text-center" />
                </div>
              </div>
              <button onClick={handleSaveConfig} className="w-full h-12 bg-accent/20 hover:bg-accent text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all border border-accent/30 shadow-[0_0_15px_rgba(230,57,70,0.2)] hover:shadow-[0_0_20px_rgba(230,57,70,0.5)]">
                Salvar Configuração
              </button>
            </div>
          </div>

          {/* TIMER */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden text-center">
            <div className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              timeLeft > 0 ? "opacity-0" : "bg-red-500/10 opacity-100 animate-pulse"
            )} />
            <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-4 opacity-60 flex items-center justify-center gap-2 relative z-10">
              <Clock size={14} className={timeLeft === 0 ? "text-red-500" : "text-accent"} /> 
              Cronômetro
            </h2>
            <div className="relative z-10">
              {timeLeft > 0 ? (
                <div className="space-y-2">
                  <div className="text-5xl font-black text-white tracking-widest font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">
                    Próximo post em
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl font-black text-red-500 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                    POSTAR AGORA!
                  </div>
                  <div className="text-[10px] font-black text-red-400/60 uppercase tracking-[0.3em]">
                    Hora de disparar
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ADICIONAR CONTA (embaixo no canto esquerdo) */}
          <div className="glass p-6 rounded-[2rem] border border-white/5">
            <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-4 opacity-60 flex items-center gap-2">
              <Users size={14} className="text-accent" /> Adicionar Nova Conta
            </h2>
            <div className="flex gap-2">
              <select 
                value={newAccPlatform} 
                onChange={e => setNewAccPlatform(e.target.value)}
                className="w-28 bg-black/30 border border-white/10 rounded-xl text-[9px] font-black uppercase text-white px-2 outline-none h-10"
              >
                <option>TikTok</option><option>Instagram</option><option>YouTube</option>
              </select>
              <input 
                type="text" placeholder="@conta" value={newAccHandle} onChange={e => setNewAccHandle(e.target.value)}
                className="flex-1 bg-black/30 border border-white/10 rounded-xl text-xs font-bold text-white px-3 outline-none h-10 focus:border-accent"
              />
              <button onClick={handleAddAccount} className="w-10 h-10 bg-accent/20 hover:bg-accent rounded-xl flex items-center justify-center text-white border border-accent/30 transition-all">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: CONTAS SALVAS + POSTAGENS DO DIA */}
        <div className="xl:col-span-8">
          <div className="glass p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden h-full">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-30" />
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] opacity-60 flex items-center gap-2">
                <Rocket size={14} className="text-accent" /> Contas Salvas — Postagens de Hoje
              </h2>
              <div className="flex items-end gap-2 bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Total Hoje:</span>
                <span className="text-xl font-black text-white leading-none">{logsToday.length}</span>
                <span className="text-xs font-black text-text-dim mb-0.5">/ {config?.dailyTarget || 9}</span>
              </div>
            </div>

            {accountsList.length === 0 ? (
              <div className="text-center py-16 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                <Users size={40} className="mx-auto text-text-dim opacity-20 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-text-dim opacity-60">Nenhuma conta salva.</p>
                <p className="text-[9px] font-bold text-text-dim/40 mt-1">Adicione uma conta no painel da esquerda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {accountsList.filter(Boolean).map(acc => {
                  const accLogsToday = getLogsForAccountToday(acc.handle);
                  return (
                    <div key={acc.id} className="bg-black/20 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                      
                      {/* Cabeçalho da conta */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-3 h-3 rounded-full shadow-lg",
                            acc.platform === 'TikTok' ? "bg-[#00f2fe] shadow-[#00f2fe]/30" :
                            acc.platform === 'Instagram' ? "bg-pink-500 shadow-pink-500/30" :
                            "bg-red-500 shadow-red-500/30"
                          )} />
                          <div>
                            <div className="text-sm font-black text-white">{acc.handle}</div>
                            <div className="text-[9px] font-black text-text-dim uppercase tracking-widest">{acc.platform}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right mr-2">
                            <div className="text-xl font-black text-white leading-none">{accLogsToday.length}</div>
                            <div className="text-[8px] font-black text-text-dim uppercase tracking-widest">postados</div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handlePostVideo(acc)}
                            className="h-10 px-5 bg-accent text-white font-black text-[9px] uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-[0_0_12px_rgba(230,57,70,0.3)]"
                          >
                            <Play size={12} fill="white" /> Postei
                          </motion.button>
                          <button onClick={() => handleRemoveAccount(acc.id)} className="w-8 h-8 flex items-center justify-center text-text-dim hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-all">
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Horários dos posts de hoje */}
                      {accLogsToday.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                          {accLogsToday.map(log => (
                            <div key={log.id} className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg group">
                              <Clock size={10} className="text-accent" />
                              <span className="text-[10px] font-black text-white">
                                {format(safeDate(log.postedAt), 'HH:mm')}
                              </span>
                              <button onClick={() => handleDeleteLog(log.id)} className="opacity-0 group-hover:opacity-100 text-red-500 ml-1 transition-all">
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====== GRÁFICO DE ATIVIDADE DIÁRIA (FULL WIDTH) ====== */}
      <div className="glass p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-30" />
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] opacity-60 flex items-center gap-2">
            <BarChart3 size={14} className="text-accent" /> Gráfico da Competição
            {compName && <span className="text-accent ml-2">— {compName}</span>}
          </h2>
          <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-text-dim">
            <span className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded" /> Postados</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 bg-accent/30 rounded border border-accent/40" /> Meta ({config?.dailyTarget || 9})</span>
            <span>Dias: {daysPassed}/{totalDays}</span>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center py-12 opacity-50">
            <BarChart3 size={50} className="mx-auto text-text-dim opacity-20 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Configure a competição para ver o gráfico.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar pb-4">
            <div className="flex gap-3 items-end min-w-max" style={{ height: '200px' }}>
              {chartData.map((day, i) => {
                const barHeight = maxCount > 0 ? (day.count / maxCount) * 160 : 0;
                const metaHeight = maxCount > 0 ? ((config?.dailyTarget || 9) / maxCount) * 160 : 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-2 relative group" style={{ minWidth: '48px' }}>
                    {/* Tooltip */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-surface border border-white/10 rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20 whitespace-nowrap shadow-xl">
                      <span className="text-[9px] font-black text-white">{day.count} vídeos</span>
                    </div>
                    
                    {/* Contagem */}
                    <span className={cn("text-[10px] font-black", day.count >= (config?.dailyTarget || 9) ? "text-green-400" : day.isToday ? "text-accent" : "text-text-dim")}>
                      {day.count}
                    </span>
                    
                    {/* Container da barra */}
                    <div className="relative flex items-end justify-center" style={{ height: '160px', width: '32px' }}>
                      {/* Linha da meta */}
                      <div className="absolute left-0 right-0 border-t border-dashed border-accent/30" style={{ bottom: `${metaHeight}px` }} />
                      
                      {/* Barra */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: barHeight }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className={cn(
                          "w-full rounded-t-lg relative",
                          day.isToday 
                            ? "bg-accent shadow-[0_0_15px_rgba(230,57,70,0.5)]" 
                            : day.count >= (config?.dailyTarget || 9) 
                              ? "bg-green-500/80" 
                              : day.isPast 
                                ? "bg-blue-500/60" 
                                : "bg-white/10"
                        )}
                      />
                    </div>
                    
                    {/* Data */}
                    <div className="text-center">
                      <div className={cn("text-[9px] font-black uppercase", day.isToday ? "text-accent" : "text-text-dim/60")}>
                        {day.dayName}
                      </div>
                      <div className={cn("text-[10px] font-black", day.isToday ? "text-white" : "text-text-dim")}>
                        {day.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ====== HISTÓRICO DETALHADO POR DIA (FULL WIDTH) ====== */}
      <div className="glass p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
        <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center gap-2">
          <History size={14} className="text-accent" /> Histórico Detalhado por Dia
        </h2>
        
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {historyByDay.map(([dateKey, dayLogs]) => {
              // Agrupa por conta
              const byAccount: Record<string, WarRoomPostLog[]> = {};
              dayLogs.forEach(l => {
                const key = `${l.platform}|${l.account}`;
                if (!byAccount[key]) byAccount[key] = [];
                byAccount[key].push(l);
              });

              return (
                <motion.div
                  key={dateKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/20 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <Calendar size={14} className="text-accent" />
                      <span className="text-sm font-black text-white uppercase">
                        {format(safeDate(dateKey), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="bg-accent/20 px-3 py-1 rounded-lg border border-accent/30">
                      <span className="text-[10px] font-black text-accent uppercase tracking-widest">
                        {dayLogs.length} vídeos
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(byAccount).map(([key, accLogs]) => {
                      const [platform, account] = key.split('|');
                      return (
                        <div key={key} className="bg-white/3 rounded-xl p-4 border border-white/5">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              platform === 'TikTok' ? "bg-[#00f2fe]" :
                              platform === 'Instagram' ? "bg-pink-500" :
                              "bg-red-500"
                            )} />
                            <span className="text-xs font-black text-white">{account}</span>
                            <span className="text-[9px] font-black text-text-dim uppercase tracking-widest ml-auto bg-white/5 px-2 py-0.5 rounded">
                              {accLogs.length} posts
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {accLogs.map(l => (
                              <span key={l.id} className="text-[9px] font-bold text-text-dim bg-black/30 px-2 py-1 rounded flex items-center gap-1 group">
                                <Clock size={8} className="text-accent" />
                                {format(safeDate(l.postedAt), 'HH:mm')}
                                <button onClick={() => handleDeleteLog(l.id)} className="opacity-0 group-hover:opacity-100 text-red-500 transition-all">
                                  <X size={8} />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {historyByDay.length === 0 && (
            <div className="text-center py-12 text-text-dim text-[10px] font-black uppercase tracking-widest opacity-40">
              Nenhum registro ainda. Comece a postar!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
