import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../lib/storage';
import { WarRoomPostLog, WarRoomConfig } from '../types';
import { useToast } from './Toast';
import { format, differenceInDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, Clock, Upload, Plus, History, Calendar, Activity, Rocket } from 'lucide-react';
import { cn } from '../lib/utils';

export default function WarRoom() {
  const { showToast } = useToast();
  
  const [logs, setLogs] = useState<WarRoomPostLog[]>([]);
  const [config, setConfig] = useState<WarRoomConfig | null>(null);
  
  // Form states
  const [platform, setPlatform] = useState('TikTok');
  const [account, setAccount] = useState('');
  
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
    
    // Check timer
    if (loadedLogs.length > 0) {
      const lastPostTime = new Date(loadedLogs[0].postedAt).getTime();
      const now = Date.now();
      const elapsed = now - lastPostTime;
      const oneHour = 60 * 60 * 1000;
      if (elapsed < oneHour) {
        setTimeLeft(Math.floor((oneHour - elapsed) / 1000));
      } else {
        setTimeLeft(0);
      }
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
      postedAt: new Date().toISOString()
    };
    
    await storage.saveWarRoomLog(newLog as any);
    showToast('Vídeo registrado com sucesso!', 'success');
    setAccount('');
    loadData();
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* TIMER AND NEW POST - COL 1 */}
        <div className="lg:col-span-5 space-y-8">
          
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
                  <div className="text-5xl font-black text-white tracking-widest font-mono">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">
                    Tempo até o próximo post
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl font-black text-red-500 uppercase tracking-widest animate-bounce mt-2">
                    POSTAR AGORA!
                  </div>
                  <div className="text-[10px] font-black text-red-400/60 uppercase tracking-[0.2em]">
                    Atenção requerida
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
            <form onSubmit={handleLogPost} className="space-y-5">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Plataforma</label>
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
                          : "bg-black/30 border-white/5 text-text-dim hover:bg-white/5"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">Nome da Conta (@)</label>
                <input
                  type="text"
                  required
                  placeholder="@seu_perfil"
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  className="w-full h-14 bg-black/30 border border-white/10 rounded-xl px-5 text-sm font-black text-white placeholder:text-white/20 outline-none focus:border-accent transition-colors"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="w-full h-14 bg-accent text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-xl flex items-center justify-center gap-2 shadow-glow mt-4"
              >
                <Plus size={16} /> Confirmar Disparo
              </motion.button>
            </form>
          </div>
          
          {/* TODAY'S PERFORMANCE */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/5">
             <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-4 opacity-60 flex items-center gap-2">
              <Activity size={14} className="text-accent" /> Desempenho Hoje
            </h2>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-5xl font-black text-white leading-none">{logsToday.length}</span>
              <span className="text-xl font-black text-text-dim mb-1">/ {config?.dailyTarget || 9}</span>
            </div>
            <div className="text-[10px] font-black text-text-dim uppercase tracking-widest">
              Vídeos disparados hoje
            </div>
          </div>
          
        </div>

        {/* TRACKING AND GRAPH - COL 2 */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* COMPETITION GRAPH */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/5">
            <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center justify-between">
              <div className="flex items-center gap-2"><Rocket size={14} className="text-accent" /> Progresso da Guerra</div>
            </h2>
            
            {!config ? (
              <div className="text-center py-10 opacity-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Configure os dados da competição abaixo.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Visual Bars */}
                <div className="space-y-5">
                  {/* Videos Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-blue-400">Vídeos Postados</span>
                      <span className="text-white">{logsInComp.length} de {totalTarget}</span>
                    </div>
                    <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${videosProgress}%` }}
                        transition={{ duration: 1 }}
                        className="h-full bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                      />
                    </div>
                  </div>
                  
                  {/* Time Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-red-400">Dias Corridos</span>
                      <span className="text-white">{daysPassed} de {totalDays}</span>
                    </div>
                    <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${currentDayProgress}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="h-full bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                   <div className="text-center space-y-1">
                     <div className="text-[9px] font-black text-text-dim uppercase tracking-widest">Meta Diária</div>
                     <div className="text-xl font-black text-white">{config.dailyTarget}</div>
                   </div>
                   <div className="text-center space-y-1 border-x border-white/5">
                     <div className="text-[9px] font-black text-text-dim uppercase tracking-widest">Restam</div>
                     <div className="text-xl font-black text-white">{Math.max(0, totalTarget - logsInComp.length)}</div>
                   </div>
                   <div className="text-center space-y-1">
                     <div className="text-[9px] font-black text-text-dim uppercase tracking-widest">Dias Rest.</div>
                     <div className="text-xl font-black text-white">{Math.max(0, totalDays - daysPassed)}</div>
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* COMPETITION CONFIG */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/5">
            <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center gap-2">
              <Calendar size={14} className="text-accent" /> Parâmetros da Missão
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full h-12 bg-black/30 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full h-12 bg-black/30 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-text-dim uppercase tracking-widest">Qtd/Dia</label>
                <input
                  type="number"
                  value={dailyTarget}
                  onChange={e => setDailyTarget(Number(e.target.value))}
                  className="w-full h-12 bg-black/30 border border-white/10 rounded-xl px-3 text-xs font-black text-white outline-none focus:border-accent"
                />
              </div>
            </div>
            <button
              onClick={handleSaveConfig}
              className="w-full h-12 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all border border-white/10"
            >
              Salvar Parâmetros
            </button>
          </div>
          
          {/* HISTÓRICO RECENTE */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/5 h-64 overflow-y-auto custom-scrollbar">
            <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center gap-2">
              <History size={14} className="text-accent" /> Histórico Recente
            </h2>
            <div className="space-y-3">
              {logs.slice(0, 10).map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded",
                      log.platform === 'TikTok' ? "bg-[#00f2fe]/20 text-[#00f2fe]" :
                      log.platform === 'Instagram' ? "bg-pink-500/20 text-pink-500" :
                      "bg-red-500/20 text-red-500"
                    )}>
                      {log.platform}
                    </div>
                    <span className="text-xs font-bold text-white">{log.account}</span>
                  </div>
                  <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">
                    {format(new Date(log.postedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center text-text-dim text-[10px] font-black uppercase tracking-widest opacity-50 pt-4">
                  Nenhum vídeo registrado ainda
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
