import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Eye, Trophy, Calculator, ArrowUp, User } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Ranking({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const [minhaPos, setMinhaPos] = useState('');
  const [outraPos, setOutraPos] = useState('');
  const [minhasViews, setMinhasViews] = useState('');
  const [viewsOutro, setViewsOutro] = useState('');
  const [resultado, setResultado] = useState<number | null>(null);
  const [calculado, setCalculado] = useState(false);

  const parsarNum = (v: string) => {
    const limpo = v.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(limpo);
    return isNaN(n) ? 0 : n;
  };

  const formatarNum = (n: number) =>
    n.toLocaleString('pt-BR');

  const calcular = () => {
    const mV = parsarNum(minhasViews);
    const oV = parsarNum(viewsOutro);
    const diff = oV - mV;
    setResultado(diff > 0 ? diff : 0);
    setCalculado(true);
  };

  const jaUltrapassou = resultado === 0 && calculado;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 pt-10">

      {/* HEADER */}
      <header className="flex items-center gap-6 bg-surface/30 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem]">
        <div className="w-20 h-20 bg-accent rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-2xl shadow-accent/30">
          <TrendingUp size={36} />
        </div>
        <div>
          <h1 className="text-5xl font-black tracking-tighter leading-none mb-2 gradient-text uppercase">
            Painel View
          </h1>
          <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] opacity-60 italic">
            Calculadora de Domínio de Views
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ===== LADO ESQUERDO: INPUTS ===== */}
        <div className="space-y-5">

          {/* Posições */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/5">
            <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center gap-2">
              <Trophy size={14} className="text-accent" /> Posições no Ranking
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Minha Posição */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-accent/20 rounded-lg flex items-center justify-center">
                    <User size={14} className="text-accent" />
                  </div>
                  <label className="text-[10px] font-black text-accent uppercase tracking-widest">
                    Sua Posição
                  </label>
                </div>
                <input
                  type="number"
                  placeholder="Ex: 5"
                  value={minhaPos}
                  onChange={e => { setMinhaPos(e.target.value); setCalculado(false); }}
                  className="w-full h-16 bg-black/30 border border-white/10 rounded-2xl px-5 text-2xl font-black text-white placeholder:text-white/20 placeholder:text-base outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Posição do Outro */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center">
                    <User size={14} className="text-text-dim" />
                  </div>
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">
                    Posição do Outro
                  </label>
                </div>
                <input
                  type="number"
                  placeholder="Ex: 2"
                  value={outraPos}
                  onChange={e => { setOutraPos(e.target.value); setCalculado(false); }}
                  className="w-full h-16 bg-black/30 border border-white/10 rounded-2xl px-5 text-2xl font-black text-white placeholder:text-white/20 placeholder:text-base outline-none focus:border-white/40 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Views */}
          <div className="glass p-8 rounded-[2.5rem] border border-white/5">
            <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] mb-6 opacity-60 flex items-center gap-2">
              <Eye size={14} className="text-accent" /> Total de Views
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Minhas Views */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Eye size={14} className="text-accent" />
                  </div>
                  <label className="text-[10px] font-black text-accent uppercase tracking-widest">
                    Suas Views
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Ex: 125.750"
                  value={minhasViews}
                  onChange={e => { setMinhasViews(e.target.value); setCalculado(false); }}
                  className="w-full h-16 bg-black/30 border border-white/10 rounded-2xl px-5 text-lg font-black text-white placeholder:text-white/20 placeholder:text-sm outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Views do Outro */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center">
                    <Eye size={14} className="text-text-dim" />
                  </div>
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest">
                    Views do Outro
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Ex: 140.980"
                  value={viewsOutro}
                  onChange={e => { setViewsOutro(e.target.value); setCalculado(false); }}
                  className="w-full h-16 bg-black/30 border border-white/10 rounded-2xl px-5 text-lg font-black text-white placeholder:text-white/20 placeholder:text-sm outline-none focus:border-white/40 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Botão Calcular */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={calcular}
            disabled={!minhasViews || !viewsOutro}
            className="w-full h-18 py-5 bg-accent text-white font-black text-sm uppercase tracking-[0.4em] rounded-[2rem] flex items-center justify-center gap-3 shadow-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Calculator size={22} />
            Calcular Domínio
          </motion.button>
        </div>

        {/* ===== LADO DIREITO: RESULTADO ===== */}
        <div className="glass rounded-[2.5rem] border border-white/5 p-8 flex flex-col gap-6">
          <h2 className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em] opacity-60 flex items-center gap-2">
            <ArrowUp size={14} className="text-accent" /> Resultado da Análise
          </h2>

          {/* Cards de posição e views */}
          <div className="grid grid-cols-2 gap-4">
            {/* Você */}
            <div className="bg-accent/10 border border-accent/30 rounded-2xl p-5 space-y-3">
              <div className="text-[9px] font-black text-accent uppercase tracking-[0.3em]">Você</div>
              <div className="flex items-end gap-2">
                <span className="text-[10px] text-text-dim font-bold uppercase">Posição</span>
                <span className="text-3xl font-black text-white leading-none">#{minhaPos || '?'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye size={12} className="text-accent" />
                <span className="text-sm font-black text-white">
                  {minhasViews ? formatarNum(parsarNum(minhasViews)) : '0'} views
                </span>
              </div>
            </div>

            {/* Outro */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="text-[9px] font-black text-text-dim uppercase tracking-[0.3em]">Outro</div>
              <div className="flex items-end gap-2">
                <span className="text-[10px] text-text-dim font-bold uppercase">Posição</span>
                <span className="text-3xl font-black text-white leading-none">#{outraPos || '?'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye size={12} className="text-text-dim" />
                <span className="text-sm font-black text-white">
                  {viewsOutro ? formatarNum(parsarNum(viewsOutro)) : '0'} views
                </span>
              </div>
            </div>
          </div>

          {/* Barra visual comparação */}
          {calculado && minhasViews && viewsOutro && (
            <div className="space-y-3">
              <div className="text-[9px] font-black text-text-dim uppercase tracking-widest opacity-60">Comparação Visual</div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-black text-accent">
                    <span>Você</span>
                    <span>{formatarNum(parsarNum(minhasViews))}</span>
                  </div>
                  <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((parsarNum(minhasViews) / Math.max(parsarNum(minhasViews), parsarNum(viewsOutro))) * 100, 100)}%` }}
                      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                      className="h-full bg-accent rounded-full"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-black text-text-dim">
                    <span>Outro</span>
                    <span>{formatarNum(parsarNum(viewsOutro))}</span>
                  </div>
                  <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((parsarNum(viewsOutro) / Math.max(parsarNum(minhasViews), parsarNum(viewsOutro))) * 100, 100)}%` }}
                      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                      className="h-full bg-white/30 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resultado Principal */}
          <AnimatePresence>
            {calculado && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className={cn(
                  "rounded-2xl p-6 border text-center flex-1 flex flex-col items-center justify-center gap-3",
                  jaUltrapassou
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-accent/10 border-accent/30"
                )}
              >
                {jaUltrapassou ? (
                  <>
                    <Trophy size={40} className="text-green-400" />
                    <div className="text-[11px] font-black text-green-400 uppercase tracking-[0.3em]">
                      Você já ultrapassou! 🏆
                    </div>
                    <div className="text-sm font-bold text-green-300/70">
                      Continue postando para aumentar a vantagem!
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[11px] font-black text-text-dim uppercase tracking-[0.3em]">
                      Views necessárias para passar
                    </div>
                    <div className="text-5xl font-black text-accent leading-none">
                      {formatarNum(resultado ?? 0)}
                    </div>
                    <div className="text-[10px] font-black text-text-dim uppercase tracking-widest opacity-60">
                      views a mais que você precisa
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {!calculado && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center gap-4 opacity-20 py-8"
              >
                <Calculator size={60} />
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-center">
                  Preencha os dados e calcule
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
