import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../lib/storage';
import { WarRoomPostLog, WarRoomConfig } from '../types';
import { useToast } from './Toast';
import { format, differenceInDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, Clock, Rocket, Calendar, Activity, Trash2, Hourglass, Plus, X, Users, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export default function WarRoom() {
  const { showToast } = useToast();
  
  const [logs, setLogs] = useState<WarRoomPostLog[]>([]);
  const [config, setConfig] = useState<WarRoomConfig | null>(null);
  
  // Timer settings
  const [timerMinutes, setTimerMinutes] = useState(60); 
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Config Form
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [dailyTarget, setDailyTarget] = useState(9);
  
  // Accounts config
  const [accountsList, setAccountsList] = useState<{ id: string; platform: string; handle: string; }[]>([]);
  const [newAccPlatform, setNewAccPlatform] = useState('TikTok');
  const [newAccHandle, setNewAccHandle] = useState('');

  // Launch Panel Form
  const [launchCounts, setLaunchCounts] = useState<Record<string, number>>({});

  const loadData = async () => {
    const loadedLogs = await storage.getWarRoomLogs();
    const validLogs = (loadedLogs || []).filter(Boolean);
    setLogs(validLogs);
    
    const loadedConfig = await storage.getWarRoomConfig();
    if (loadedConfig) {
      setConfig(loadedConfig);
      setStartDate(loadedConfig.startDate || format(new Date(), 'yyyy-MM-dd'));
      setEndDate(loadedConfig.endDate || format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
      setDailyTarget(loadedConfig.dailyTarget || 9);
      setAccountsList((loadedConfig.accounts || []).filter(Boolean));
    }
    
    // Check timer
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
      setTimeLeft(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = async () => {
    const newConfig = { startDate, endDate, dailyTarget, accounts: accountsList };
    await storage.saveWarRoomConfig(newConfig);
    setConfig(newConfig);
    showToast('Configurações salvas!', 'success');
  };

  const handleAddAccount = () => {
    if (!newAccHandle) return;
    setAccountsList(prev => [...prev, { id: crypto.randomUUID(), platform: newAccPlatform, handle: newAccHandle }]);
    setNewAccHandle('');
  };

  const handleRemoveAccount = (id: string) => {
    setAccountsList(prev => prev.filter(a => a.id !== id));
  };

  const handleLaunchCycle = async () => {
    const totalVideosToLaunch = Object.values(launchCounts).reduce((a, b) => a + (b || 0), 0);
    
    if (totalVideosToLaunch === 0) {
      showToast('Nenhum vídeo preenchido para disparar.', 'error');
      return;
    }

    const cycleTime = new Date().toISOString();
    
    // Create logs for each video
    for (const acc of accountsList) {
      const count = launchCounts[acc.id] || 0;
      for (let i = 0; i < count; i++) {
        await storage.saveWarRoomLog({
          platform: acc.platform,
          account: acc.handle,
          postedAt: cycleTime,
          timerDurationMinutes: timerMinutes
        } as any);
      }
    }
    
    showToast(`Disparo realizado! (${totalVideosToLaunch} vídeos)`, 'success');
    setLaunchCounts({}); // reset inputs
    loadData(); // Recarrega logs e reinicia timer
  };

  const handleDeleteLog = async (id: string) => {
    await storage.deleteWarRoomLog(id);
    showToast('Registro apagado!', 'success');
    loadData();
  };

  // Funções seguras de data
  const safeDate = (dString: string) => {
    const d = new Date(dString);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const logsInComp = config ? logs.filter(l => {
    if (!l.postedAt) return false;
    const d = safeDate(l.postedAt);
    return d >= safeDate(config.startDate) && d <= safeDate(config.endDate + 'T23:59:59');
  }) : [];
  
  const totalDays = config ? Math.max(1, differenceInDays(safeDate(config.endDate), safeDate(config.startDate)) + 1) : 1;
  const daysPassed = config ? Math.max(0, differenceInDays(new Date(), safeDate(config.startDate))) : 0;
  const currentDayProgress = Math.min(100, (daysPassed / totalDays) * 100);
  
  const totalTarget = config ? config.dailyTarget * totalDays : 0;
  const videosProgress = totalTarget > 0 ? Math.min(100, (logsInComp.length / totalTarget) * 100) : 0;
  
  const logsToday = logs.filter(l => {
    if (!l.postedAt) return false;
    return isSameDay(safeDate(l.postedAt), new Date());
  });
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Agrupa os logs do histórico recente por "ciclos" (mesmo timestamp)
  const recentLogs = logs.slice(0, 15);
  const cycleGroups: Record<string, WarRoomPostLog[]> = {};
  recentLogs.forEach(log => {
    const key = log.postedAt || new Date().toISOString();
    if (!cycleGroups[key]) cycleGroups[key] = [];
    cycleGroups[key].push(log);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 pt-10">
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
            Disparo Simultâneo em Lote
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* ================= COLUNA 1: PAINEL DE DISPARO ================= */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* TIMER */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group text-center">
            <div className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              timeLeft > 0 ? "bg-accent/5 opacity-0" : "bg-red-500/10 opacity-100 animate-pulse"
            )} />
            <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-4 opacity-60 flex items-center justify-center gap-2 relative z-10">
              <Clock size={14} className={timeLeft === 0 ? "text-red-500" : "text-accent"} /> 
              Status de Postagem
            </h2>
            <div className="relative z-10">
              {timeLeft > 0 ? (
                <div className="space-y-2">
                  <div className="text-6xl font-black text-white tracking-widest font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">
                    Tempo até o próximo post
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-5xl font-black text-red-500 uppercase tracking-widest mt-2 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                    POSTAR AGORA!
                  </div>
                  <div className="text-[10px] font-black text-red-400/60 uppercase tracking-[0.3em]">
                    Atenção requerida imediatamente
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LAUNCH PANEL */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />
            
            <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center gap-2">
              <Rocket size={14} className="text-accent" /> Painel de Disparo Simultâneo
            </h2>

            {accountsList.length === 0 ? (
              <div className="text-center py-8 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                <Users size={30} className="mx-auto text-text-dim opacity-30 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-text-dim opacity-60">Nenhuma conta salva.</p>
                <p className="text-[9px] font-bold text-text-dim/50 mt-1">Configure suas contas no painel ao lado.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-3">
                  {accountsList.filter(Boolean).map(acc => (
                    <div key={acc.id} className="flex items-center justify-between p-4 bg-black/30 rounded-2xl border border-white/5 focus-within:border-accent/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          acc.platform === 'TikTok' ? "bg-[#00f2fe]" :
                          acc.platform === 'Instagram' ? "bg-pink-500" :
                          "bg-red-500"
                        )} />
                        <div>
                          <div className="text-xs font-black text-white">{acc.handle}</div>
                          <div className="text-[9px] font-black text-text-dim uppercase tracking-widest">{acc.platform}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-text-dim uppercase tracking-widest">Vídeos:</span>
                        <input 
                          type="number"
                          min="0"
                          placeholder="0"
                          value={launchCounts[acc.id] || ''}
                          onChange={e => setLaunchCounts(prev => ({ ...prev, [acc.id]: Number(e.target.value) }))}
                          className="w-14 h-10 bg-surface border border-white/10 rounded-lg text-center text-sm font-black text-white outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                  <label className="text-[9px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2">
                    <Hourglass size={12} className="text-accent" /> Iniciar cronômetro para (minutos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={timerMinutes}
                    onChange={e => setTimerMinutes(Number(e.target.value))}
                    className="w-full h-14 bg-black/30 border border-white/10 rounded-xl px-5 text-lg font-black text-white outline-none focus:border-accent text-center"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLaunchCycle}
                  className="w-full h-16 bg-accent text-white font-black text-[12px] uppercase tracking-[0.3em] rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(230,57,70,0.4)] mt-4"
                >
                  <Zap size={18} /> Iniciar Ciclo de Disparo
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* ================= COLUNA 2: GRÁFICOS E CONFIGS ================= */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* PROGRESS BAR & STATS */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/5 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] opacity-60 flex items-center gap-2">
                <Activity size={14} className="text-accent" /> Progresso da Guerra
              </h2>
              <div className="flex items-end gap-2 bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Hoje:</span>
                <span className="text-xl font-black text-white leading-none">{logsToday.length}</span>
                <span className="text-xs font-black text-text-dim mb-0.5">/ {config?.dailyTarget || 9}</span>
              </div>
            </div>
            
            {!config ? (
              <div className="text-center py-4 opacity-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Configure abaixo.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-blue-400">Total de Vídeos Postados</span>
                    <span className="text-white">{logsInComp.length} de {totalTarget}</span>
                  </div>
                  <div className="h-5 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InBhdHRlcm4iIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDAgMEw0MCAwTDQwIDQwWk00MCAwTDAgNDBaIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIgLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcGF0dGVybikiIC8+PC9zdmc+')] opacity-20 z-10 pointer-events-none" />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${videosProgress}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] relative z-0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CONFIGURAÇÕES GERAIS */}
            <div className="glass p-8 rounded-[2.5rem] border border-white/5">
              <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center gap-2">
                <Calendar size={14} className="text-accent" /> Setup da Máquina
              </h2>
              
              {/* Contas Salvas */}
              <div className="mb-6 space-y-3">
                <h3 className="text-[9px] font-black text-white uppercase tracking-widest">Suas Contas (Armas)</h3>
                
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {accountsList.filter(Boolean).map(acc => (
                    <div key={acc.id} className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5">
                      <span className="text-[10px] font-bold text-white ml-2">{acc.handle} <span className="text-text-dim">({acc.platform})</span></span>
                      <button onClick={() => handleRemoveAccount(acc.id)} className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-500/20 rounded">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-2">
                  <select 
                    value={newAccPlatform} 
                    onChange={e => setNewAccPlatform(e.target.value)}
                    className="w-1/3 bg-black/30 border border-white/10 rounded-lg text-[9px] font-black uppercase text-white px-2 outline-none"
                  >
                    <option>TikTok</option><option>Instagram</option><option>YouTube</option>
                  </select>
                  <input 
                    type="text" placeholder="@conta" value={newAccHandle} onChange={e => setNewAccHandle(e.target.value)}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg text-xs font-bold text-white px-3 outline-none"
                  />
                  <button onClick={handleAddAccount} className="w-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 text-white">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Parâmetros Metas */}
              <div className="space-y-4 mb-6 border-t border-white/5 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Início</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-10 bg-black/30 border border-white/10 rounded-lg px-2 text-[10px] text-white outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Fim</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-10 bg-black/30 border border-white/10 rounded-lg px-2 text-[10px] text-white outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Meta de Vídeos/Dia</label>
                  <input type="number" value={dailyTarget} onChange={e => setDailyTarget(Number(e.target.value))} className="w-full h-10 bg-black/30 border border-white/10 rounded-lg px-3 text-xs font-black text-white outline-none" />
                </div>
              </div>
              
              <button onClick={handleSaveConfig} className="w-full h-12 bg-accent/20 hover:bg-accent text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all border border-accent/30 shadow-[0_0_15px_rgba(230,57,70,0.2)] hover:shadow-[0_0_20px_rgba(230,57,70,0.5)]">
                Salvar Regras
              </button>
            </div>

            {/* HISTÓRICO RECENTE */}
            <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col h-[480px]">
              <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center gap-2 shrink-0">
                <History size={14} className="text-accent" /> Ciclos Recentes
              </h2>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                <AnimatePresence initial={false}>
                  {Object.keys(cycleGroups).map(timestamp => (
                    <motion.div 
                      key={timestamp} 
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                      className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-3 relative group"
                    >
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[9px] font-black text-text-dim uppercase tracking-widest">
                          Ciclo de {timestamp ? format(safeDate(timestamp), "dd/MM 'às' HH:mm", { locale: ptBR }) : 'Desconhecido'}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {cycleGroups[timestamp].filter(Boolean).map(log => (
                          <div key={log.id} className="flex items-center justify-between group/item">
                            <div className="flex items-center gap-2">
                              <span className={cn("w-1.5 h-1.5 rounded-full", log.platform === 'TikTok' ? "bg-[#00f2fe]" : log.platform === 'Instagram' ? "bg-pink-500" : "bg-red-500")} />
                              <span className="text-[11px] font-bold text-white">{log.account}</span>
                            </div>
                            <button onClick={() => handleDeleteLog(log.id)} className="opacity-0 group-hover/item:opacity-100 text-red-500 hover:bg-red-500/20 w-5 h-5 rounded flex items-center justify-center transition-all">
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {Object.keys(cycleGroups).length === 0 && (
                  <div className="h-full flex items-center justify-center text-text-dim text-[10px] font-black uppercase tracking-widest opacity-40">
                    Nenhum disparo hoje
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
