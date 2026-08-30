// Finance.tsx – High-Performance Nexus Finance UI
import React, { useState, useEffect, useMemo, memo } from 'react';
import { storage } from '../lib/storage';
import { FinanceEntry, Competition } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';
import {
  Plus,
  DollarSign,
  Trash2,
  TrendingUp,
  Calendar as CalendarIcon,
  X,
  Wallet,
  ArrowUpRight,
  Sparkles,
  Loader2,
  Activity,
  Scissors,
  BarChart3,
  Star,
  ArrowLeft,
  Eye,
  Trophy,
  LayoutDashboard,
  ChevronDown,
  Calculator,
  Target,
  Heart,
  Clock,
  CalendarDays,
  Edit3,
  Check,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';

const OVERVIEW_ID = 'overview-geral';

export default function Finance({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'new'>('history');

  // Competition form fields
  const [isCreatingComp, setIsCreatingComp] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompStartDate, setNewCompStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newCompEndDate, setNewCompEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newCompTargetAmount, setNewCompTargetAmount] = useState('');

  // Edit Meta Modal State
  const [isEditingMetaModalOpen, setIsEditingMetaModalOpen] = useState(false);
  const [editMetaInput, setEditMetaInput] = useState('');

  // Entry form fields
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [cuts, setCuts] = useState('');
  const [views, setViews] = useState('');
  const [likes, setLikes] = useState('');
  const [sourceCompetitionId, setSourceCompetitionId] = useState('');
  const [paymentType, setPaymentType] = useState<'diario' | 'mensal'>('diario');

  const loadData = async () => {
    try {
      const [financeData, compData] = await Promise.all([
        storage.getFinance(),
        storage.getCompetitions(),
      ]);
      setEntries(financeData);
      setCompetitions(compData);
    } catch (e) {
      console.error(e);
      showToast('Erro ao carregar dados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── High-Performance Memoized Compilations ──
  const displayedCompetitions = useMemo<Competition[]>(() => {
    const overviewComp: Competition = {
      id: OVERVIEW_ID,
      name: 'Painel Geral',
      startDate: '2026-01-01',
      endDate: format(new Date(), 'yyyy-MM-dd'),
      createdAt: new Date(0).toISOString(),
    };

    const hasLegacy = entries.some(e => !e.competitionId);
    const sortedCompetitions = [...competitions].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const list: Competition[] = [overviewComp, ...sortedCompetitions];
    if (hasLegacy) {
      const legacyDates = entries.filter(e => !e.competitionId).map(e => e.date).sort();
      list.push({
        id: 'legacy-general',
        name: 'Lançamentos Gerais (Legado)',
        startDate: legacyDates[0] || '2026-01-01',
        endDate: legacyDates[legacyDates.length - 1] || format(new Date(), 'yyyy-MM-dd'),
        createdAt: new Date(0).toISOString(),
      });
    }
    return list;
  }, [competitions, entries]);

  const compEntriesMap = useMemo(() => {
    const map = new Map<string, { entries: FinanceEntry[]; total: number; cuts: number; views: number; likes: number }>();
    
    // Process all non-overview entries
    entries.forEach(e => {
      const compId = e.competitionId || 'legacy-general';
      const item = map.get(compId) || { entries: [], total: 0, cuts: 0, views: 0, likes: 0 };
      item.entries.push(e);
      item.total += e.amount;
      item.cuts += (e.cuts || 0);
      item.views += (e.views || 0);
      item.likes += (e.likes || 0);
      map.set(compId, item);
    });

    // Process overview = aggregate ALL entries
    map.set(OVERVIEW_ID, {
      entries: entries,
      total: entries.reduce((a, c) => a + c.amount, 0),
      cuts: entries.reduce((a, c) => a + (c.cuts || 0), 0),
      views: entries.reduce((a, c) => a + (c.views || 0), 0),
      likes: entries.reduce((a, c) => a + (c.likes || 0), 0),
    });

    return map;
  }, [entries]);

  const parseMetaAmount = (str: string): number | undefined => {
    if (!str || typeof str !== 'string' || str.trim() === '') return undefined;
    let cleaned = str.replace(/R\$/gi, '').replace(/\s/g, '');
    if (cleaned.includes('.') && cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    const val = parseFloat(cleaned);
    return isNaN(val) || val <= 0 ? undefined : val;
  };

  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) { showToast('O nome da competição é obrigatório.', 'error'); return; }
    try {
      const targetVal = parseMetaAmount(newCompTargetAmount);
      await storage.saveCompetition({
        name: newCompName,
        startDate: newCompStartDate,
        endDate: newCompEndDate,
        targetAmount: targetVal && targetVal > 0 ? targetVal : undefined,
        createdAt: new Date().toISOString()
      });
      await loadData();
      showToast('Competição criada com sucesso!', 'success');
      setNewCompName('');
      setNewCompTargetAmount('');
      setIsCreatingComp(false);
    } catch (err) {
      console.error('Erro ao criar competição:', err);
      showToast('Erro ao criar competição.', 'error');
    }
  };

  const handleSaveMeta = async (comp: Competition, newMetaStr: string) => {
    try {
      const targetVal = parseMetaAmount(newMetaStr);
      const updatedComp: Competition = {
        ...comp,
        targetAmount: targetVal && targetVal > 0 ? targetVal : undefined,
      };

      // 1. Immediately update state so UI updates with ZERO delay
      setCompetitions(prev => prev.map(c => c.id === comp.id ? updatedComp : c));

      // 2. Persist to storage
      await storage.saveCompetition(updatedComp);

      // 3. Reload full dataset
      await loadData();
      showToast('Meta de faturamento atualizada com sucesso!', 'success');
      setIsEditingMetaModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar meta:', err);
      showToast('Erro ao salvar meta.', 'error');
    }
  };

  const handleDeleteCompetition = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === OVERVIEW_ID) return;
    if (id === 'legacy-general') {
      if (confirm('ATENÇÃO: Deseja apagar permanentemente TODOS os lançamentos antigos/legados? Essa ação não pode ser desfeita.')) {
        try {
          const legacyEntries = entries.filter(e => !e.competitionId);
          for (const entry of legacyEntries) await storage.deleteFinance(entry.id);
          if (selectedCompetitionId === 'legacy-general') setSelectedCompetitionId(null);
          await loadData();
          showToast('Lançamentos legados apagados.', 'success');
        } catch { showToast('Erro ao apagar lançamentos legados.', 'error'); }
      }
      return;
    }
    if (confirm(`ATENÇÃO: Deseja apagar a competição "${name}"? Todos os lançamentos vinculados serão apagados permanentemente.`)) {
      try {
        await storage.deleteCompetition(id);
        if (selectedCompetitionId === id) setSelectedCompetitionId(null);
        await loadData();
        showToast('Competição e lançamentos apagados.', 'success');
      } catch { showToast('Erro ao excluir.', 'error'); }
    }
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompetitionId) return;
    if (!amount || isNaN(parseFloat(amount))) { showToast('Informe um valor válido.', 'error'); return; }
    if (parseFloat(amount) === 0) { showToast('Valor não pode ser zero.', 'error'); return; }
    const isOverview = selectedCompetitionId === OVERVIEW_ID;
    try {
      const entry: FinanceEntry = {
        id: crypto.randomUUID(),
        amount: parseFloat(amount),
        description: description || 'Entrada',
        date,
        paymentType,
        competitionId: selectedCompetitionId,
        sourceCompetitionId: isOverview && sourceCompetitionId ? sourceCompetitionId : undefined,
        cuts: cuts && parseInt(cuts) >= 0 ? parseInt(cuts) : undefined,
        views: views && parseInt(views) >= 0 ? parseInt(views) : undefined,
        likes: likes && parseInt(likes) >= 0 ? parseInt(likes) : undefined,
      };
      await storage.saveFinance(entry);
      await loadData();
      showToast('Registro salvo com sucesso!', 'success');
      setAmount(''); setDescription(''); setCuts(''); setViews(''); setLikes(''); setSourceCompetitionId(''); setPaymentType('diario');
      setActiveTab('history');
    } catch { showToast('Erro ao salvar. Tente novamente.', 'error'); }
  };

  const handleDeleteEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Remover esta transação?')) {
      try {
        await storage.deleteFinance(id);
        await loadData();
        showToast('Transação removida.', 'success');
      } catch { showToast('Erro ao remover.', 'error'); }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="text-accent animate-spin" size={40} />
          <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] animate-pulse">Sincronizando dados...</p>
        </div>
      </div>
    );
  }

  const activeComp = displayedCompetitions.find(c => c.id === selectedCompetitionId);

  // ── HOME: Competition list ──
  if (!selectedCompetitionId || !activeComp) {
    const overviewStats = compEntriesMap.get(OVERVIEW_ID) || { total: 0, entries: [] };
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const ovMonthly = overviewStats.entries.filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      return d >= monthStart && d <= monthEnd;
    }).reduce((acc, e) => acc + e.amount, 0);

    return (
      <div className="max-w-7xl mx-auto pb-24 pt-4 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-accent rounded-full" />
              <p className="text-[9px] font-black text-accent uppercase tracking-[0.4em]">G-HUB · Módulo Financeiro</p>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Competições <span className="text-accent">Financeiras</span>
            </h1>
            <p className="text-text-dim text-[11px] mt-1 font-medium">Gestão de ativos por campeonatos e competições</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreatingComp(true)}
              className="h-10 bg-accent text-white px-6 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] flex items-center gap-2 hover:brightness-110 transition-all cursor-pointer"
            >
              <Plus size={15} /> Nova Competição
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Fixed Painel Geral Card */}
          <div
            onClick={() => { setSelectedCompetitionId(OVERVIEW_ID); setActiveTab('history'); }}
            className="relative overflow-hidden bg-[#16161e] border border-accent/30 rounded-2xl p-6 cursor-pointer hover:border-accent/60 transition-all duration-200 group hover:-translate-y-0.5"
          >
            <div className="absolute top-3 right-16 flex items-center gap-1.5 px-2.5 py-1 bg-accent/20 border border-accent/30 rounded-full">
              <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              <span className="text-[8px] font-black text-accent uppercase tracking-wider">Fixo</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
                <LayoutDashboard size={22} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-white group-hover:text-accent transition-colors">Painel Geral</h3>
                <p className="text-[10px] text-text-dim/60 font-semibold mt-0.5">Resumo consolidado de todas as competições</p>
              </div>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 sm:ml-auto">
                <div>
                  <div className="text-[8px] font-black text-text-dim/40 uppercase tracking-wider mb-0.5">Total Acumulado</div>
                  <div className="text-lg font-black text-white">R$ {overviewStats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div className="text-[8px] font-black text-text-dim/40 uppercase tracking-wider mb-0.5">Este Mês</div>
                  <div className="text-lg font-black text-white">R$ {ovMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Competitions Grid */}
          {displayedCompetitions.filter(c => c.id !== OVERVIEW_ID).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedCompetitions.filter(c => c.id !== OVERVIEW_ID).map((comp) => {
                const stats = compEntriesMap.get(comp.id) || { total: 0, cuts: 0, views: 0 };
                return (
                  <div
                    key={comp.id}
                    onClick={() => { setSelectedCompetitionId(comp.id); setActiveTab('history'); }}
                    className="relative overflow-hidden bg-[#121218] border border-white/8 rounded-2xl p-6 cursor-pointer hover:border-accent/40 hover:bg-[#161622] transition-all duration-200 hover:-translate-y-0.5 group"
                  >
                    <div className="flex flex-col h-full justify-between gap-4">
                      <div>
                        <div className="flex items-start justify-between pr-6">
                          <h3 className="text-base font-black text-white group-hover:text-accent transition-colors truncate">{comp.name}</h3>
                          {comp.id !== OVERVIEW_ID && (
                            <button
                              onClick={(e) => handleDeleteCompetition(comp.id, comp.name, e)}
                              className="p-1.5 rounded-lg text-text-dim/40 hover:text-red-400 hover:bg-red-500/10 transition-colors absolute top-4 right-4 z-20 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold text-text-dim">
                          <CalendarIcon size={10} className="text-accent/60" />
                          <span>{format(new Date(comp.startDate + 'T00:00:00'), 'dd/MM/yyyy')} - {format(new Date(comp.endDate + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {comp.targetAmount && comp.targetAmount > 0 ? (
                          <div className="space-y-1 bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                              <span className="text-text-dim/80 flex items-center gap-1">
                                <Target size={10} className="text-accent" /> Meta: R$ {comp.targetAmount.toLocaleString('pt-BR')}
                              </span>
                              <span className={stats.total >= comp.targetAmount ? 'text-emerald-400 font-black' : 'text-accent font-black'}>
                                {Math.min(100, Math.round((stats.total / comp.targetAmount) * 100))}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  stats.total >= comp.targetAmount
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                                    : 'bg-gradient-to-r from-accent to-red-400'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(2, (stats.total / comp.targetAmount) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                        <div className="pt-3 border-t border-white/5 grid grid-cols-4 gap-1">
                          <div>
                            <div className="text-[8px] font-black text-text-dim/40 uppercase tracking-wider mb-0.5">Ganho</div>
                            <div className="text-[11px] font-black text-white truncate">R${stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
                          </div>
                          <div>
                            <div className="text-[8px] font-black text-text-dim/40 uppercase tracking-wider mb-0.5">Cortes</div>
                            <div className="text-[11px] font-black text-white flex items-center gap-1 truncate"><Scissors size={10} className="text-accent/60" /> {stats.cuts}</div>
                          </div>
                          <div>
                            <div className="text-[8px] font-black text-text-dim/40 uppercase tracking-wider mb-0.5">Views</div>
                            <div className="text-[11px] font-black text-white flex items-center gap-0.5 truncate">
                              <Eye size={10} className="text-blue-400" />
                              {stats.views >= 1000000 ? `${(stats.views / 1000000).toFixed(1)}M` : stats.views >= 1000 ? `${(stats.views / 1000).toFixed(0)}k` : stats.views}
                            </div>
                          </div>
                          <div>
                            <div className="text-[8px] font-black text-text-dim/40 uppercase tracking-wider mb-0.5">Likes</div>
                            <div className="text-[11px] font-black text-white flex items-center gap-0.5 truncate">
                              <Heart size={10} className="text-red-400" />
                              {stats.likes >= 1000000 ? `${(stats.likes / 1000000).toFixed(1)}M` : stats.likes >= 1000 ? `${(stats.likes / 1000).toFixed(0)}k` : stats.likes || 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {displayedCompetitions.filter(c => c.id !== OVERVIEW_ID).length === 0 && (
            <div className="bg-black/20 border border-dashed border-white/5 rounded-3xl p-14 text-center max-w-lg mx-auto">
              <Trophy size={44} className="mx-auto mb-4 text-accent/40" />
              <h3 className="text-lg font-black text-white mb-2">Nenhuma Competição Cadastrada</h3>
              <p className="text-xs text-text-dim mb-6 max-w-sm mx-auto leading-relaxed">
                Crie suas competições para organizar seus ganhos.
              </p>
              <button onClick={() => setIsCreatingComp(true)} className="px-6 py-3 bg-accent text-white rounded-xl font-black uppercase tracking-[0.15em] text-[10px] hover:brightness-110 transition-all cursor-pointer">
                Começar Agora
              </button>
            </div>
          )}
        </div>

        {/* Create Competition Modal */}
        <AnimatePresence>
          {isCreatingComp && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[100]"
            >
              <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
                className="bg-[#141419] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl"
              >
                <button onClick={() => setIsCreatingComp(false)} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-dim hover:text-white hover:bg-white/10 transition-colors cursor-pointer"><X size={15} /></button>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1"><Trophy size={18} className="text-accent" /><h3 className="text-lg font-black text-white">Registrar Competição</h3></div>
                  <p className="text-[10px] text-text-dim uppercase tracking-wider font-semibold">Crie um novo painel para seus ganhos</p>
                </div>
                <form onSubmit={handleCreateCompetition} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-text-dim">Nome da Competição</label>
                    <input type="text" required value={newCompName} onChange={(e) => setNewCompName(e.target.value)} placeholder="Ex: Competição Luan Santana"
                      className="w-full h-11 bg-white/[0.04] border border-white/8 rounded-xl px-4 outline-none focus:border-accent/50 font-black text-white text-sm placeholder:text-white/20 uppercase tracking-wide transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-text-dim">Início</label>
                      <input type="date" required value={newCompStartDate} onChange={(e) => setNewCompStartDate(e.target.value)}
                        className="w-full h-11 bg-white/[0.04] border border-white/8 rounded-xl px-3 outline-none focus:border-accent/50 font-black text-white text-xs transition-colors" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-text-dim">Término</label>
                      <input type="date" required value={newCompEndDate} onChange={(e) => setNewCompEndDate(e.target.value)}
                        className="w-full h-11 bg-white/[0.04] border border-white/8 rounded-xl px-3 outline-none focus:border-accent/50 font-black text-white text-xs transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-text-dim flex items-center gap-1">
                      <Target size={11} className="text-accent" /> Meta de Faturamento (R$) <span className="text-text-dim/40 font-normal">(Opcional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-accent">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newCompTargetAmount}
                        onChange={(e) => setNewCompTargetAmount(e.target.value)}
                        placeholder="Ex: 5000,00"
                        className="w-full h-11 bg-white/[0.04] border border-white/8 rounded-xl pl-10 pr-4 outline-none focus:border-accent/50 font-black text-white text-sm placeholder:text-white/20 transition-colors"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full h-12 bg-accent text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:brightness-110 transition-colors mt-2 flex items-center justify-center gap-1.5 cursor-pointer">
                    <Plus size={14} /> Criar Competição
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <CalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
          initialCompId={calcCompId}
          competitions={displayedCompetitions}
          entries={entries}
        />
      </div>
    );
  }

  // ── COMPETITION / OVERVIEW DETAIL VIEW ──
  const isOverview = activeComp.id === OVERVIEW_ID;
  const isLegacy = activeComp.id === 'legacy-general';

  const compEntries = (compEntriesMap.get(activeComp.id)?.entries || []);

  const totalGeneral = compEntries.reduce((acc, cur) => acc + cur.amount, 0);
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const currentMonthEntries = compEntries.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d >= monthStart && d <= monthEnd;
  });
  const totalMonthly = currentMonthEntries.reduce((acc, cur) => acc + cur.amount, 0);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const totalToday = compEntries.filter(e => e.date === todayStr).reduce((acc, cur) => acc + cur.amount, 0);

  const byDay: Record<string, number> = {};
  compEntries.forEach(e => { byDay[e.date] = (byDay[e.date] || 0) + e.amount; });
  let bestDay = { date: '', total: 0 };
  Object.keys(byDay).forEach(d => { if (byDay[d] > bestDay.total) bestDay = { date: d, total: byDay[d] }; });
  const avgDay = Object.keys(byDay).length > 0 ? totalGeneral / Object.keys(byDay).length : 0;

  const chartData = Array.from({ length: 14 }).map((_, i) => {
    const d = subDays(new Date(), 13 - i);
    const dayStr = format(d, 'yyyy-MM-dd');
    const dayEntries = compEntries.filter(e => e.date === dayStr);
    const dayTotal = dayEntries.reduce((a, c) => a + c.amount, 0);
    const dayCuts = dayEntries.reduce((a, c) => a + (c.cuts || 0), 0);
    const dayViews = dayEntries.reduce((a, c) => a + (c.views || 0), 0);
    return { date: format(d, 'dd/MM'), valor: dayTotal, cortes: dayCuts, views: dayViews, fullDate: dayStr, hasData: dayTotal > 0 };
  });
  const avg = chartData.reduce((s, d) => s + d.valor, 0) / chartData.length;

  const sortedEntries = [...compEntries].sort((a, b) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime());
  const groupedByDay = sortedEntries.reduce((acc, entry) => {
    (acc[entry.date] ??= []).push(entry);
    return acc;
  }, {} as Record<string, FinanceEntry[]>);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-[#0f0f14] border border-white/10 rounded-2xl p-4 shadow-xl min-w-[170px]">
          <div className="text-[9px] font-black text-text-dim uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />{d.date}
          </div>
          <div className="text-xl font-black text-white">R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          {!isOverview && d.cortes > 0 && (<div className="flex items-center gap-1.5 mt-2 text-[9px] font-black text-accent"><Scissors size={9} /> {d.cortes} Cortes</div>)}
          {!isOverview && d.views > 0 && (<div className="flex items-center gap-1.5 mt-1 text-[9px] font-black text-blue-400"><Eye size={9} /> {d.views.toLocaleString('pt-BR')} Views</div>)}
        </div>
      );
    }
    return null;
  };

  const allKpiCards = [
    {
      id: 'total',
      label: 'Total Acumulado',
      value: `R$ ${totalGeneral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: <Wallet size={20} />,
      color: 'accent',
      border: 'border-accent/20',
      sub: avgDay > 0 ? `Média: R$ ${avgDay.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/dia` : `${compEntries.length} registros`,
      badge: <TrendingUp size={12} />,
    },
    {
      id: 'month',
      label: 'Este Mês',
      value: `R$ ${totalMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: <Activity size={20} />,
      color: 'blue-500',
      border: 'border-blue-500/20',
      sub: `${currentMonthEntries.length} lançamentos`,
      badge: <BarChart3 size={12} />,
    },
    {
      id: 'today',
      label: 'Hoje',
      value: `R$ ${totalToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: <ArrowUpRight size={20} />,
      color: 'green-500',
      border: 'border-green-500/20',
      sub: 'Atualizado hoje',
      badge: <Activity size={12} />,
    },
    {
      id: 'best',
      label: 'Melhor Dia',
      value: bestDay.date ? `R$ ${bestDay.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Sem dados',
      icon: <Star size={20} />,
      color: 'amber-500',
      border: 'border-amber-500/20',
      sub: bestDay.date ? format(new Date(bestDay.date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR }) : 'Primeiro registro pendente',
      badge: <TrendingUp size={12} />,
    },
  ];

  const kpiCards = isOverview ? allKpiCards.filter(c => c.id !== 'today') : allKpiCards;
  const chartHeight = isOverview ? 380 : 260;

  const getSourceCompName = (entry: FinanceEntry) => {
    if (!entry.sourceCompetitionId) return null;
    return competitions.find(c => c.id === entry.sourceCompetitionId)?.name || null;
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 pt-4 space-y-8">
      {/* Header */}
      <div className="space-y-6">
        {/* Top Header Row: Navigation, Title & Date (Left) | Action Buttons (Right) - RED LINE AREA */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <button onClick={() => setSelectedCompetitionId(null)} className="flex items-center gap-1.5 text-[9px] font-black text-text-dim hover:text-white uppercase tracking-wider mb-2 transition-colors cursor-pointer">
              <ArrowLeft size={11} /> Voltar para Competições
            </button>
            <div className="flex items-center gap-2 mb-2">
              {isOverview
                ? <LayoutDashboard size={16} className="text-accent" />
                : <div className="w-1.5 h-6 bg-accent rounded-full" />
              }
              <p className="text-[9px] font-black text-accent uppercase tracking-[0.4em]">
                {isOverview ? 'Painel Fixo · Visão Geral' : 'Painel de Competição'}
              </p>
              {isOverview && (
                <span className="px-2 py-0.5 bg-accent/20 border border-accent/30 rounded-full text-[8px] font-black text-accent uppercase tracking-wider">Fixo</span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">{activeComp.name}</h1>
            {!isOverview && (
              <p className="text-text-dim text-[11px] mt-1 font-semibold flex items-center gap-1.5">
                <CalendarIcon size={12} className="text-accent/60" />
                {format(new Date(activeComp.startDate + 'T00:00:00'), 'dd/MM/yyyy')} até {format(new Date(activeComp.endDate + 'T00:00:00'), 'dd/MM/yyyy')}
              </p>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-3">
            {!isOverview && (
              <button
                onClick={async () => {
                  if (confirm('ATENÇÃO: Deseja apagar TODOS os registros desta competição?')) {
                    for (const entry of compEntries) await storage.deleteFinance(entry.id);
                    await loadData();
                    showToast('Registros limpos.');
                  }
                }}
                className="h-10 px-4 rounded-xl font-black uppercase tracking-wider text-[9px] border border-white/5 text-text-dim hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-colors cursor-pointer"
              >
                Limpar Registros
              </button>
            )}
            <button
              onClick={() => setActiveTab('new')}
              className="h-10 bg-accent text-white px-6 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] flex items-center gap-2 hover:brightness-110 transition-colors cursor-pointer"
            >
              <Plus size={15} /> Novo Registro
            </button>
          </div>
        </div>

        {/* 🎯 META DE FATURAMENTO - CYBER/NEXUS ULTRA PREMIUM CARD */}
        {!isOverview && (
          <div className="w-full relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#1e0a10] via-[#14121d] to-[#0d0c18] border border-accent/50 shadow-[0_0_40px_rgba(230,57,70,0.3)] hover:shadow-[0_0_60px_rgba(230,57,70,0.5)] transition-all duration-500 overflow-hidden group">
            {/* Glowing neon top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-rose-500 to-amber-400 rounded-t-full shadow-[0_0_20px_#E63946]" />
            
            {/* Ambient Backlight Blur Glows */}
            <div className="absolute -top-28 -right-28 w-96 h-96 bg-accent/25 rounded-full blur-[120px] pointer-events-none group-hover:bg-accent/35 transition-all duration-700" />
            <div className="absolute -bottom-28 -left-28 w-96 h-96 bg-rose-600/15 rounded-full blur-[120px] pointer-events-none" />

            {/* Header Row: Target Icon, Title, Action Button & Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/40 via-accent/20 to-red-950/80 border border-accent/70 flex items-center justify-center text-accent shadow-[0_0_30px_rgba(230,57,70,0.6)]">
                    <Target size={28} className="animate-pulse text-accent" />
                  </div>
                  <div className="absolute -inset-1 bg-accent/30 rounded-2xl blur-md pointer-events-none -z-10 animate-ping opacity-40" />
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-[0.25em] text-white">
                      Meta de Faturamento
                    </h2>
                    <button
                      onClick={() => {
                        setEditMetaInput(activeComp.targetAmount ? activeComp.targetAmount.toString() : '');
                        setIsEditingMetaModalOpen(true);
                      }}
                      className="text-[10px] font-black text-white hover:text-white flex items-center gap-1.5 bg-gradient-to-r from-accent to-rose-600 hover:from-rose-600 hover:to-accent border border-white/20 px-3.5 py-1.5 rounded-xl transition-all shadow-[0_0_15px_rgba(230,57,70,0.4)] active:scale-95 cursor-pointer uppercase tracking-wider"
                    >
                      <Edit3 size={12} /> {activeComp.targetAmount ? 'Alterar Meta' : '+ Definir Meta'}
                    </button>
                  </div>
                  <p className="text-[10px] text-text-dim/80 font-bold tracking-wider mt-1">
                    {activeComp.targetAmount 
                      ? '🎯 Alvo estratégico de rentabilidade da competição' 
                      : '⚡ Nenhuma meta definida para esta competição'}
                  </p>
                </div>
              </div>

              {activeComp.targetAmount && activeComp.targetAmount > 0 ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] border transition-all shadow-xl ${
                    totalGeneral >= activeComp.targetAmount
                      ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.5)] animate-pulse'
                      : 'bg-gradient-to-r from-accent/30 via-red-500/20 to-rose-500/20 text-white border-accent/50 shadow-[0_0_25px_rgba(230,57,70,0.5)]'
                  }`}>
                    {totalGeneral >= activeComp.targetAmount
                      ? '🎉 META CONCLUÍDA!'
                      : `🔥 ${Math.min(100, Math.round((totalGeneral / activeComp.targetAmount) * 100))}% ALCANÇADO`
                    }
                  </span>
                </div>
              ) : null}
            </div>

            {/* Laser Progress Bar & 3 Futuristic Metric Tiles */}
            {activeComp.targetAmount && activeComp.targetAmount > 0 ? (
              <div className="space-y-6 relative z-10">
                {/* Laser Progress Bar */}
                <div className="relative w-full h-4 bg-black/80 rounded-full overflow-hidden border border-white/20 p-0.5 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 relative ${
                      totalGeneral >= activeComp.targetAmount
                        ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-[0_0_30px_rgba(16,185,129,1)]'
                        : 'bg-gradient-to-r from-accent via-rose-500 to-amber-400 shadow-[0_0_30px_rgba(230,57,70,1)]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, (totalGeneral / activeComp.targetAmount) * 100))}%` }}
                  >
                    <div className="absolute inset-0 bg-white/25 animate-pulse" />
                  </div>
                </div>

                {/* 3 Metric Tiles with Glowing Neon Borders */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl group/tile hover:border-white/30 transition-all">
                    <div className="text-[9px] font-black text-text-dim/80 uppercase tracking-[0.2em] mb-1">Meta Estipulada</div>
                    <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      R$ {activeComp.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-accent/20 to-red-950/40 border border-accent/50 rounded-2xl p-4 sm:p-5 shadow-xl group/tile hover:border-accent transition-all shadow-[0_0_25px_rgba(230,57,70,0.25)]">
                    <div className="text-[9px] font-black text-accent uppercase tracking-[0.2em] mb-1">Ganho Atual</div>
                    <div className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-[0_0_12px_rgba(230,57,70,0.8)]">
                      R$ {totalGeneral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-500/20 to-teal-950/40 border border-emerald-500/50 rounded-2xl p-4 sm:p-5 shadow-xl group/tile hover:border-emerald-500 transition-all shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                    <div className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">
                      {totalGeneral >= activeComp.targetAmount ? 'Superávit Acima da Meta' : 'Restante para a Meta'}
                    </div>
                    <div className={`text-xl sm:text-2xl font-black tracking-tight ${totalGeneral >= activeComp.targetAmount ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'text-white'}`}>
                      R$ {Math.abs(activeComp.targetAmount - totalGeneral).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

        {activeTab === 'history' ? (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className={`grid gap-4 ${kpiCards.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
              {kpiCards.map((card) => (
                <div key={card.label}
                  className={`bg-[#121218] border ${card.border} rounded-2xl p-5 cursor-default hover:border-white/20 transition-colors`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-dim/70">{card.label}</p>
                    <div className={`w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-${card.color}`}>{card.icon}</div>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none mb-2">{card.value}</p>
                  <div className={`flex items-center gap-1 text-[9px] font-bold text-${card.color} opacity-80`}>{card.badge}<span>{card.sub}</span></div>
                </div>
              ))}
            </div>

            {/* Chart + Ledger */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Chart */}
              <div className={`${isOverview ? 'lg:col-span-3' : 'lg:col-span-2'} bg-[#121218] border border-white/8 rounded-2xl p-6 sm:p-8`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
                  <div>
                    <h2 className="text-lg font-black text-white tracking-tight">Gráfico de Evolução</h2>
                    <p className="text-[9px] font-black text-text-dim/50 uppercase tracking-[0.3em] mt-0.5">Últimos 14 dias</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-text-dim/60 uppercase tracking-wider">
                      <div className="w-2 h-2 bg-accent/40 rounded-sm" /><span>Ganhos</span>
                    </div>
                    {avg > 0 && (
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-text-dim/60 uppercase tracking-wider">
                        <div className="w-3 h-px bg-blue-400/50" /><span>Média</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/15 rounded-full">
                      <Sparkles size={9} className="text-accent" />
                      <span className="text-[8px] font-black text-accent uppercase tracking-wider">Live</span>
                    </div>
                  </div>
                </div>

                <div style={{ height: chartHeight }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} barGap={4} barCategoryGap="32%">
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E63946" stopOpacity={0.12} />
                          <stop offset="100%" stopColor="#E63946" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E63946" stopOpacity={0.75} />
                          <stop offset="100%" stopColor="#E63946" stopOpacity={0.18} />
                        </linearGradient>
                        <linearGradient id="barGradHot" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff4d6d" stopOpacity={1} />
                          <stop offset="100%" stopColor="#c9184a" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="date" stroke="transparent" tick={{ fill: '#6e6e73', fontSize: 9, fontWeight: 900, fontFamily: 'monospace' }} tickLine={false} axisLine={false} dy={8} />
                      <YAxis stroke="transparent" tick={{ fill: '#6e6e73', fontSize: 9, fontWeight: 900, fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v === 0 ? '' : `R$${(v / 1000).toFixed(0)}k`)} width={38} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)', radius: 8 }} />
                      {avg > 0 && <ReferenceLine y={avg} stroke="rgba(96,165,250,0.25)" strokeDasharray="5 4" strokeWidth={1} />}
                      <Area type="monotone" dataKey="valor" fill="url(#areaGrad)" stroke="transparent" isAnimationActive={false} />
                      <Bar dataKey="valor" radius={[5, 5, 2, 2]} maxBarSize={isOverview ? 36 : 28} isAnimationActive={false}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.valor > avg * 1.5 ? 'url(#barGradHot)' : entry.hasData ? 'url(#barGrad)' : 'rgba(255,255,255,0.025)'} />
                        ))}
                      </Bar>
                      <Line type="monotone" dataKey="valor" stroke="rgba(230,57,70,0.35)" strokeWidth={1.5} dot={false} strokeDasharray="4 4" isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Ledger */}
              {!isOverview && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-black text-white tracking-tight uppercase flex items-center gap-2">
                      <CalendarIcon size={14} className="text-accent" /> Lançamentos
                    </h2>
                    <div className="text-[9px] font-black text-text-dim/60 uppercase tracking-widest bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
                      {compEntries.length} total
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                    {Object.keys(groupedByDay).length === 0 ? (
                      <div className="bg-black/20 border border-dashed border-white/5 rounded-2xl p-10 text-center">
                        <DollarSign size={28} className="mx-auto mb-3 opacity-10 text-accent" />
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-dim/50">Nenhum registro.</p>
                      </div>
                    ) : (
                      (Object.entries(groupedByDay) as [string, FinanceEntry[]][]).map(([day, dayEntries]) => (
                        <div key={day} className="space-y-1.5">
                          <div className="flex items-center justify-between px-1">
                            <div className="text-[9px] font-black uppercase tracking-wider text-text-dim/40">{format(new Date(day + 'T00:00:00'), "dd 'de' MMM", { locale: ptBR })}</div>
                            <div className="text-[9px] font-black text-text-dim/40">R$ {dayEntries.reduce((a, e) => a + e.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          </div>
                          {dayEntries.map(entry => (
                            <div key={entry.id} className="group relative flex items-center justify-between p-3.5 rounded-xl bg-[#121218] border border-white/5 hover:border-white/10 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-accent/10 text-accent border border-accent/15"><DollarSign size={14} /></div>
                                <div className="min-w-0">
                                  <div className="font-black text-white text-sm">Ganhei R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                  <div className="text-[10px] text-text-dim/80 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 font-semibold">
                                    {entry.paymentType && (
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${entry.paymentType === 'mensal' ? 'bg-purple-500/15 text-purple-400 border-purple-500/25' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'}`}>
                                        {entry.paymentType === 'mensal' ? <CalendarDays size={9} /> : <Clock size={9} />}
                                        {entry.paymentType === 'mensal' ? 'Mensal' : 'Diário'}
                                      </span>
                                    )}
                                    {entry.cuts !== undefined && entry.cuts > 0 && (<span className="flex items-center gap-1"><Scissors size={10} className="text-accent" /> {entry.cuts} cortes</span>)}
                                    {entry.cuts !== undefined && entry.cuts > 0 && entry.views !== undefined && entry.views > 0 && (<span className="text-white/20">•</span>)}
                                    {entry.views !== undefined && entry.views > 0 && (<span className="flex items-center gap-1 text-blue-400"><Eye size={10} /> {entry.views.toLocaleString('pt-BR')} views</span>)}
                                    {entry.likes !== undefined && entry.likes > 0 && (
                                      <>
                                        {((entry.cuts !== undefined && entry.cuts > 0) || (entry.views !== undefined && entry.views > 0)) && (<span className="text-white/20">•</span>)}
                                        <span className="flex items-center gap-1 text-red-400"><Heart size={10} /> {entry.likes.toLocaleString('pt-BR')} curtidas</span>
                                      </>
                                    )}
                                    <span className="text-text-dim/60 truncate max-w-[130px]">Origem: {entry.description}</span>
                                  </div>
                                </div>
                              </div>
                              <button onClick={e => handleDeleteEntry(entry.id, e)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim/30 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"><Trash2 size={11} /></button>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Overview ledger */}
            {isOverview && (
              <div className="bg-[#121218] border border-white/8 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-black text-white tracking-tight uppercase flex items-center gap-2">
                    <CalendarIcon size={14} className="text-accent" /> Histórico de Entradas
                  </h2>
                  <div className="text-[9px] font-black text-text-dim/60 uppercase tracking-widest bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">{compEntries.length} total</div>
                </div>
                {Object.keys(groupedByDay).length === 0 ? (
                  <div className="p-10 text-center">
                    <DollarSign size={28} className="mx-auto mb-3 opacity-10 text-accent" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-dim/50">Nenhum registro no painel geral.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                    {(Object.entries(groupedByDay) as [string, FinanceEntry[]][]).map(([day, dayEntries]) => (
                      <div key={day}>
                        <div className="text-[9px] font-black uppercase tracking-wider text-text-dim/40 px-1 mb-1.5">
                          {format(new Date(day + 'T00:00:00'), "dd 'de' MMMM yyyy", { locale: ptBR })}
                        </div>
                        {dayEntries.map(entry => {
                          const srcName = getSourceCompName(entry);
                          return (
                            <div key={entry.id} className="group flex items-center justify-between p-3.5 rounded-xl bg-[#141419] border border-white/5 hover:border-accent/20 transition-colors mb-1.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-accent/10 text-accent border border-accent/15"><DollarSign size={13} /></div>
                                <div>
                                  <div className="font-black text-white text-sm">R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                  <div className="text-[10px] text-text-dim/60 font-semibold flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                    {entry.paymentType && (
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${entry.paymentType === 'mensal' ? 'bg-purple-500/15 text-purple-400 border-purple-500/25' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'}`}>
                                        {entry.paymentType === 'mensal' ? <CalendarDays size={9} /> : <Clock size={9} />}
                                        {entry.paymentType === 'mensal' ? 'Mensal' : 'Diário'}
                                      </span>
                                    )}
                                    <span>{entry.description}{srcName ? ` · ${srcName}` : ''}</span>
                                    {entry.cuts !== undefined && entry.cuts > 0 && (
                                      <>
                                        <span className="text-white/20">•</span>
                                        <span className="flex items-center gap-1"><Scissors size={10} className="text-accent" /> {entry.cuts} cortes</span>
                                      </>
                                    )}
                                    {entry.views !== undefined && entry.views > 0 && (
                                      <>
                                        <span className="text-white/20">•</span>
                                        <span className="flex items-center gap-1 text-blue-400"><Eye size={10} /> {entry.views.toLocaleString('pt-BR')} views</span>
                                      </>
                                    )}
                                    {entry.likes !== undefined && entry.likes > 0 && (
                                      <>
                                        <span className="text-white/20">•</span>
                                        <span className="flex items-center gap-1 text-red-400"><Heart size={10} /> {entry.likes.toLocaleString('pt-BR')} curtidas</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-text-dim/50 font-bold">{format(new Date(entry.date + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                                <button onClick={e => handleDeleteEntry(entry.id, e)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"><Trash2 size={11} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* New Entry Form */
          <div className="max-w-lg mx-auto">
            <div className="bg-[#141419] border border-white/8 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Novo Registro</h2>
                  <p className="text-[9px] font-black text-text-dim/50 uppercase tracking-[0.25em] mt-0.5">
                    {isOverview ? 'Painel Geral · Entrada Manual' : `Lançamento em ${activeComp.name}`}
                  </p>
                </div>
                <button onClick={() => setActiveTab('history')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-text-dim hover:text-white hover:bg-white/10 transition-colors cursor-pointer"><X size={16} /></button>
              </div>

              <form onSubmit={handleSubmitEntry} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-dim/60 block">Valor (R$)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-accent text-xl pointer-events-none">R$</span>
                    <input type="number" step="0.01" required autoFocus value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00"
                      className="w-full h-16 bg-white/[0.04] border border-white/8 rounded-xl pl-14 pr-5 outline-none focus:border-accent/50 text-2xl font-black text-white placeholder:text-white/10 transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-dim/60 block">Descrição / Empresa</label>
                  <input type="text" required value={description} onChange={e => setDescription(e.target.value)}
                    placeholder={isOverview ? 'Ex: Luan Santana, Bison & Comasseto...' : 'Ex: Impulso Sertanejo, Cortes Tik Tok...'}
                    className="w-full h-12 bg-white/[0.04] border border-white/8 rounded-xl px-5 outline-none focus:border-accent/50 font-black text-white text-sm placeholder:text-white/20 uppercase tracking-wider transition-colors" />
                </div>

                {/* Payment Type Toggle */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-dim/60 flex items-center gap-1">
                    <Clock size={10} className="text-accent" /> Tipo de Recebimento
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentType('diario')}
                      className={`h-12 rounded-xl font-black uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                        paymentType === 'diario'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                          : 'bg-white/[0.04] border-white/8 text-text-dim hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <Clock size={14} />
                      Diário
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('mensal')}
                      className={`h-12 rounded-xl font-black uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                        paymentType === 'mensal'
                          ? 'bg-purple-500/15 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                          : 'bg-white/[0.04] border-white/8 text-text-dim hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <CalendarDays size={14} />
                      Mensal
                    </button>
                  </div>
                </div>

                {isOverview && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-dim/60 flex items-center gap-1">
                      <Trophy size={10} className="text-accent" /> Competição de Origem
                    </label>
                    <div className="relative">
                      <select
                        value={sourceCompetitionId}
                        onChange={e => setSourceCompetitionId(e.target.value)}
                        className="w-full h-12 bg-white/[0.04] border border-white/8 rounded-xl px-4 pr-10 outline-none focus:border-accent/50 font-black text-white text-sm transition-colors appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-[#141419] text-text-dim">— Selecionar competição —</option>
                        {competitions.map(c => (
                          <option key={c.id} value={c.id} className="bg-[#141419] text-white">{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim/40 pointer-events-none" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-3 sm:col-span-1">
                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-dim/60 flex items-center gap-1">
                      <Scissors size={10} className="text-accent" /> Cortes
                    </label>
                    <div className="relative">
                      <input type="number" min="0" step="1" value={cuts} onChange={e => setCuts(e.target.value)} placeholder="0"
                        className="w-full h-12 bg-white/[0.04] border border-white/8 rounded-xl px-4 pr-10 outline-none focus:border-accent/50 font-black text-white text-sm placeholder:text-white/20 transition-colors" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-text-dim/30 uppercase">vids</span>
                    </div>
                  </div>
                  <div className="space-y-2 col-span-3 sm:col-span-1">
                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-dim/60 flex items-center gap-1">
                      <Eye size={10} className="text-blue-400" /> Visualizações
                    </label>
                    <div className="relative">
                      <input type="number" min="0" step="1" value={views} onChange={e => setViews(e.target.value)} placeholder="0"
                        className="w-full h-12 bg-white/[0.04] border border-white/8 rounded-xl px-4 pr-10 outline-none focus:border-accent/50 font-black text-white text-sm placeholder:text-white/20 transition-colors" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-text-dim/30 uppercase">views</span>
                    </div>
                  </div>
                  <div className="space-y-2 col-span-3 sm:col-span-1">
                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-dim/60 flex items-center gap-1">
                      <Heart size={10} className="text-red-400" /> Curtidas
                    </label>
                    <div className="relative">
                      <input type="number" min="0" step="1" value={likes} onChange={e => setLikes(e.target.value)} placeholder="0"
                        className="w-full h-12 bg-white/[0.04] border border-white/8 rounded-xl px-4 pr-10 outline-none focus:border-accent/50 font-black text-white text-sm placeholder:text-white/20 transition-colors" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-text-dim/30 uppercase">likes</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-text-dim/60 block">Data</label>
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                    className="w-full h-12 bg-white/[0.04] border border-white/8 rounded-xl px-4 outline-none focus:border-accent/50 font-black text-white text-sm transition-colors" />
                </div>

                <button type="submit"
                  className="w-full h-13 bg-accent text-white rounded-xl font-black uppercase tracking-[0.25em] text-[11px] hover:brightness-110 transition-colors flex items-center justify-center gap-2 py-4 mt-2 cursor-pointer"
                >
                  <Plus size={15} /> Confirmar Registro
                </button>
              </form>
            </div>
          </div>
        )}
      

      <CalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        initialCompId={calcCompId}
        competitions={displayedCompetitions}
        entries={entries}
      />

      {/* Edit Meta Modal */}
      <AnimatePresence>
        {isEditingMetaModalOpen && activeComp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[100]"
          >
            <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
              className="bg-[#141419] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl"
            >
              <button onClick={() => setIsEditingMetaModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-dim hover:text-white hover:bg-white/10 transition-colors cursor-pointer"><X size={15} /></button>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1"><Target size={18} className="text-accent" /><h3 className="text-lg font-black text-white">Meta de Faturamento</h3></div>
                <p className="text-[10px] text-text-dim uppercase tracking-wider font-semibold">Defina ou altere a meta para {activeComp.name}</p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveMeta(activeComp, editMetaInput); }} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-text-dim flex items-center gap-1">
                    <Target size={11} className="text-accent" /> Valor da Meta (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-accent">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      value={editMetaInput}
                      onChange={(e) => setEditMetaInput(e.target.value)}
                      placeholder="Ex: 5000,00 (Deixe vazio para remover)"
                      className="w-full h-12 bg-white/[0.04] border border-white/8 rounded-xl pl-10 pr-4 outline-none focus:border-accent/50 font-black text-white text-base placeholder:text-white/20 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingMetaModalOpen(false)}
                    className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black uppercase tracking-[0.15em] text-[10px] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-12 bg-accent text-white rounded-xl font-black uppercase tracking-[0.15em] text-[10px] hover:brightness-110 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check size={14} /> Salvar Meta
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
