import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../lib/storage';
import { WarRoomPostLog, WarRoomConfig } from '../types';
import { useToast } from './Toast';
import { format, differenceInDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, Clock, Upload, Plus, History, Calendar, Activity, Rocket, Trash2, Hourglass } from 'lucide-react';
import { cn } from '../lib/utils';

export default function WarRoom() {
  const { showToast } = useToast();
  
  const [logs, setLogs] = useState<WarRoomPostLog[]>([]);
  const [config, setConfig] = useState<WarRoomConfig | null>(null);
  
  // Form states
  const [platform, setPlatform] = useState('TikTok');
  const [account, setAccount] = useState('');
  const [timerMinutes, setTimerMinutes] = useState(60); // Default 60 minutes
  
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [dailyTarget, setDailyTarget] = useState(9);
  
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const loadData = async () => {
    const loadedLogs = await storage.getWarRoomLogs();
    setLogs(loadedLogs);
    
    const loadedConfig = await storage.getWarRoomConfig();
    if (loadedConfig) {
      setConfig(loadedConfig);
      setStartDate(loadedConfig.startDate);
      setEndDate(loadedConfig.endDate);
      setDailyTarget(loadedConfig.dailyTarget);
    }
    
    // Check timer based on the latest log
    if (loadedLogs.length > 0) {
      const latestLog = loadedLogs[0];
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
    const newConfig = { startDate, endDate, dailyTarget };
    await storage.saveWarRoomConfig(newConfig);
    setConfig(newConfig);
    showToast('Configurações da Guerra atualizadas!', 'success');
  };

  const handleLogPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    
    const newLog = {
      platform,
      account,
      postedAt: new Date().toISOString(),
      timerDurationMinutes: timerMinutes
    };
    
    await storage.saveWarRoomLog(newLog as any);
    showToast('Vídeo registrado com sucesso!', 'success');
    setAccount('');
    loadData(); // Recarrega e ajusta o timer
  };

  const handleDeleteLog = async (id: string) => {
    await storage.deleteWarRoomLog(id);
    showToast('Registro apagado!', 'success');
    loadData(); // Recarrega e recalcula o timer baseado no log anterior
  };

  // Calculations
  const logsInComp = config ? logs.filter(l => {
    const d = new Date(l.postedAt);
    return d >= new Date(config.startDate) && d <= new Date(config.endDate + 'T23:59:59');
  }) : [];
  
  const totalDays = config ? Math.max(1, differenceInDays(new Date(config.endDate), new Date(config.startDate)) + 1) : 1;
  const daysPassed = config ? Math.max(0, differenceInDays(new Date(), new Date(config.startDate))) : 0;
  const currentDayProgress = Math.min(100, (daysPassed / totalDays) * 100);
  
  const totalTarget = config ? config.dailyTarget * totalDays : 0;
  const videosProgress = totalTarget > 0 ? Math.min(100, (logsInComp.length / totalTarget) * 100) : 0;
  
  const logsToday = logs.filter(l => isSameDay(new Date(l.postedAt), new Date()));
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
            Central de Operações e Monitoramento
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* ================= COLUNA 1: TIMER E REGISTRO ================= */}
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
                  <div className="text-5xl font-black text-red-500 uppercase tracking-widest animate-bounce mt-2 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                    POSTAR AGORA!
                  </div>
                  <div className="text-[10px] font-black text-red-400/60 uppercase tracking-[0.3em]">
                    Atenção requerida imediatamente
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LOG POST */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/5">
            <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center gap-2">
              <Upload size={14} className="text-accent" /> Registrar Novo Vídeo
            </h2>
            <form onSubmit={handleLogPost} className="space-y-6">
              
              <div className="space-y-3">
                <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Plataforma</label>
                <div className="grid grid-cols-3 gap-2">
                  {['TikTok', 'Instagram', 'YouTube'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={cn(
                        "h-12 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                        platform === p 
                          ? "bg-accent/20 border-accent text-white" 
                          : "bg-black/30 border-white/5 text-text-dim hover:bg-white/5 hover:border-white/20"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Nome da Conta (@)</label>
                <input
                  type="text"
                  required
                  placeholder="@seu_perfil"
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  className="w-full h-14 bg-black/30 border border-white/10 rounded-xl px-5 text-sm font-black text-white placeholder:text-white/20 outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2">
                  <Hourglass size={12} className="text-accent" /> Próximo post em (minutos)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={timerMinutes}
                  onChange={e => setTimerMinutes(Number(e.target.value))}
                  className="w-full h-14 bg-black/30 border border-white/10 rounded-xl px-5 text-lg font-black text-white placeholder:text-white/20 outline-none focus:border-accent transition-colors text-center"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="w-full h-16 bg-accent text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-xl flex items-center justify-center gap-2 shadow-glow mt-4"
              >
                <Plus size={18} /> Confirmar Disparo
              </motion.button>
            </form>
          </div>
          
        </div>

        {/* ================= COLUNA 2: HISTÓRICO E GRÁFICOS ================= */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* TODAY'S PERFORMANCE & COMPETITION GRAPH */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/5 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] opacity-60 flex items-center gap-2">
                <Rocket size={14} className="text-accent" /> Visão Geral
              </h2>
              <div className="flex items-end gap-2 bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Hoje:</span>
                <span className="text-xl font-black text-white leading-none">{logsToday.length}</span>
                <span className="text-xs font-black text-text-dim mb-0.5">/ {config?.dailyTarget || 9}</span>
              </div>
            </div>
            
            {!config ? (
              <div className="text-center py-10 opacity-50 bg-black/20 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Configure os dados da competição abaixo.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Visual Bars */}
                <div className="space-y-6">
                  {/* Videos Bar */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-blue-400">Vídeos Postados</span>
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
                  
                  {/* Time Bar */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-red-400">Dias Corridos</span>
                      <span className="text-white">{daysPassed} de {totalDays}</span>
                    </div>
                    <div className="h-5 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InBhdHRlcm4iIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMDAgMEw0MCAwTDQwIDQwWk00MCAwTDAgNDBaIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIgLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcGF0dGVybikiIC8+PC9zdmc+')] opacity-20 z-10 pointer-events-none" />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${currentDayProgress}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="h-full bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] relative z-0"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
                   <div className="text-center space-y-1">
                     <div className="text-[9px] font-black text-text-dim uppercase tracking-widest">Meta Diária</div>
                     <div className="text-2xl font-black text-white">{config.dailyTarget}</div>
                   </div>
                   <div className="text-center space-y-1 border-x border-white/5">
                     <div className="text-[9px] font-black text-text-dim uppercase tracking-widest">Restam</div>
                     <div className="text-2xl font-black text-white">{Math.max(0, totalTarget - logsInComp.length)}</div>
                   </div>
                   <div className="text-center space-y-1">
                     <div className="text-[9px] font-black text-text-dim uppercase tracking-widest">Dias Rest.</div>
                     <div className="text-2xl font-black text-white">{Math.max(0, totalDays - daysPassed)}</div>
                   </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* HISTÓRICO RECENTE */}
            <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col h-[320px]">
              <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center gap-2 shrink-0">
                <History size={14} className="text-accent" /> Histórico
              </h2>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                <AnimatePresence initial={false}>
                  {logs.map(log => (
                    <motion.div 
                      key={log.id} 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors group"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            log.platform === 'TikTok' ? "bg-[#00f2fe]" :
                            log.platform === 'Instagram' ? "bg-pink-500" :
                            "bg-red-500"
                          )} />
                          <span className="text-sm font-black text-white">{log.account}</span>
                        </div>
                        <span className="text-[9px] font-black text-text-dim uppercase tracking-widest opacity-60">
                          {format(new Date(log.postedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          {log.timerDurationMinutes && ` • Timer: ${log.timerDurationMinutes}m`}
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => handleDeleteLog(log.id)}
                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {logs.length === 0 && (
                  <div className="h-full flex items-center justify-center text-text-dim text-[10px] font-black uppercase tracking-widest opacity-40">
                    Nenhum disparo hoje
                  </div>
                )}
              </div>
            </div>

            {/* COMPETITION CONFIG */}
            <div className="glass p-8 rounded-[2.5rem] border border-white/5">
              <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center gap-2">
                <Calendar size={14} className="text-accent" /> Parâmetros
              </h2>
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Início</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full h-12 bg-black/30 border border-white/10 rounded-xl px-4 text-xs text-white outline-none focus:border-accent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Fim</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full h-12 bg-black/30 border border-white/10 rounded-xl px-4 text-xs text-white outline-none focus:border-accent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Metas de Vídeos (Qtd/Dia)</label>
                  <input
                    type="number"
                    value={dailyTarget}
                    onChange={e => setDailyTarget(Number(e.target.value))}
                    className="w-full h-12 bg-black/30 border border-white/10 rounded-xl px-4 text-xs font-black text-white outline-none focus:border-accent"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveConfig}
                className="w-full h-12 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all border border-white/10"
              >
                Salvar Regras
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
