import { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { Note, VideoChecklist, VideoChecklistStep } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';
import {
  Plus,
  StickyNote,
  Trash2,
  Edit2,
  X,
  Search,
  Loader2,
  Sparkles,
  ArrowRight,
  Hash,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Instagram,
  Youtube,
  MessageCircle,
  Zap,
  Trophy,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

// ----------- CHECKLIST TEMPLATES -----------
const PLATFORM_TEMPLATES: Record<string, { steps: string[]; color: string; gradient: string }> = {
  Instagram: {
    color: '#E1306C',
    gradient: 'from-[#833ab4] via-[#fd1d1d] to-[#fcb045]',
    steps: [
      'Baixar o vídeo',
      'Editar o vídeo',
      'Salvar o vídeo no Canva',
      'Ir para a plataforma, colocar música e hashtags (#)',
      'Postar o vídeo',
      'Colocar o link do vídeo na plataforma / empresa',
      'Colocar a história na descrição',
    ],
  },
  TikTok: {
    color: '#69C9D0',
    gradient: 'from-[#010101] via-[#69C9D0] to-[#EE1D52]',
    steps: [
      'Baixar o vídeo',
      'Editar o vídeo',
      'Salvar o vídeo no Canva',
      'Ir para a plataforma, colocar música e hashtags (#)',
      'Postar o vídeo',
      'Colocar o link do vídeo na plataforma / empresa',
    ],
  },
  YouTube: {
    color: '#FF0000',
    gradient: 'from-[#FF0000] to-[#CC0000]',
    steps: [
      'Baixar o vídeo',
      'Editar o vídeo',
      'Salvar o vídeo no Canva',
      'Ir para a plataforma, colocar música e hashtags (#)',
      'Postar o vídeo',
      'Colocar o link do vídeo na plataforma / empresa',
    ],
  },
  WhatsApp: {
    color: '#25D366',
    gradient: 'from-[#128C7E] to-[#25D366]',
    steps: [
      'Baixar o vídeo',
      'Editar o vídeo',
      'Salvar o vídeo no Canva',
      'Ir para a plataforma, colocar música e hashtags (#)',
      'Postar o vídeo',
      'Colocar o link do vídeo na plataforma / empresa',
    ],
  },
  Outro: {
    color: '#E63946',
    gradient: 'from-[#E63946] to-[#ff6b6b]',
    steps: [
      'Baixar o vídeo',
      'Editar o vídeo',
      'Salvar o vídeo no Canva',
      'Ir para a plataforma, colocar música e hashtags (#)',
      'Postar o vídeo',
      'Colocar o link do vídeo na plataforma / empresa',
    ],
  },
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  Instagram: <Instagram size={18} />,
  TikTok: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.73a8.16 8.16 0 0 0 4.77 1.52V6.8a4.85 4.85 0 0 1-1-.11z" />
    </svg>
  ),
  YouTube: <Youtube size={18} />,
  WhatsApp: <MessageCircle size={18} />,
  Outro: <Sparkles size={18} />,
};

// Serialize/Deserialize VideoChecklist into Note
const CHECKLIST_PREFIX = '[CHECKLIST_DATA]';

function serializeChecklist(cl: VideoChecklist): Note {
  return {
    id: cl.id,
    title: `${CHECKLIST_PREFIX} ${cl.platform} :: ${cl.title}`,
    content: JSON.stringify(cl),
    createdAt: cl.createdAt,
  };
}

function deserializeChecklist(note: Note): VideoChecklist | null {
  try {
    return JSON.parse(note.content || '');
  } catch {
    return null;
  }
}

// -------- MAIN COMPONENT --------
export default function Notes({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'notes' | 'checklists'>('notes');

  // NOTES STATE
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [search, setSearch] = useState('');
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  // CHECKLIST STATE
  const [checklists, setChecklists] = useState<VideoChecklist[]>([]);
  const [loadingChecklists, setLoadingChecklists] = useState(true);
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistPlatform, setNewChecklistPlatform] = useState<VideoChecklist['platform']>('Instagram');
  const [isSubmittingChecklist, setIsSubmittingChecklist] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [checklistToDelete, setChecklistToDelete] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const data = await storage.getNotes();
      const plain = data.filter(n => !n.title.startsWith('[ARENA_DATA]') && !n.title.startsWith(CHECKLIST_PREFIX));
      const clNotes = data.filter(n => n.title.startsWith(CHECKLIST_PREFIX));
      const cls = clNotes.map(deserializeChecklist).filter(Boolean) as VideoChecklist[];
      setNotes(plain.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setChecklists(cls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotes(false);
      setLoadingChecklists(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // ---- NOTE HANDLERS ----
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingNote(true);
    try {
      const noteData: Note = {
        id: editingNote ? editingNote.id : crypto.randomUUID(),
        title: noteTitle,
        content: noteContent,
        createdAt: editingNote ? editingNote.createdAt : new Date().toISOString(),
      };
      await storage.saveNote(noteData);
      showToast(editingNote ? 'Anotação atualizada!' : 'Anotação criada!', 'success');
      await loadAll();
      closeNoteModal();
    } catch (err) {
      showToast('Erro ao salvar anotação', 'error');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleNoteDelete = async (id: string) => {
    await storage.deleteNote(id);
    showToast('Anotação removida');
    await loadAll();
    setNoteToDelete(null);
  };

  const openNoteModal = (note?: Note) => {
    setEditingNote(note || null);
    setNoteTitle(note?.title || '');
    setNoteContent(note?.content || '');
    setNoteModalOpen(true);
  };

  const closeNoteModal = () => { setNoteModalOpen(false); setEditingNote(null); };

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase())
  );

  // ---- CHECKLIST HANDLERS ----
  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    setIsSubmittingChecklist(true);
    try {
      const template = PLATFORM_TEMPLATES[newChecklistPlatform];
      const cl: VideoChecklist = {
        id: crypto.randomUUID(),
        title: newChecklistTitle.trim(),
        platform: newChecklistPlatform,
        steps: template.steps.map((label, i) => ({ id: `step-${i}`, label, done: false })),
        createdAt: new Date().toISOString(),
      };
      await storage.saveNote(serializeChecklist(cl));
      showToast('Checklist criado!', 'success');
      await loadAll();
      setChecklistModalOpen(false);
      setNewChecklistTitle('');
      setNewChecklistPlatform('Instagram');
      setExpandedId(cl.id);
    } catch {
      showToast('Erro ao criar checklist', 'error');
    } finally {
      setIsSubmittingChecklist(false);
    }
  };

  const handleToggleStep = async (cl: VideoChecklist, stepId: string) => {
    const prevDone = cl.steps.find(s => s.id === stepId)?.done ?? false;
    const updated: VideoChecklist = {
      ...cl,
      steps: cl.steps.map(s => s.id === stepId ? { ...s, done: !s.done } : s),
    };
    await storage.saveNote(serializeChecklist(updated));

    // XP
    if (!prevDone) {
      await storage.addXP(10);
      const allDone = updated.steps.every(s => s.done);
      if (allDone) {
        await storage.addXP(50);
        showToast('🏆 Checklist 100% completo! +60 XP', 'success');
      }
    }
    await loadAll();
  };

  const handleDeleteChecklist = async (id: string) => {
    await storage.deleteNote(id);
    showToast('Checklist removido');
    await loadAll();
    setChecklistToDelete(null);
  };

  const getProgress = (cl: VideoChecklist) => {
    if (cl.steps.length === 0) return 0;
    return Math.round((cl.steps.filter(s => s.done).length / cl.steps.length) * 100);
  };

  const getPlatformColor = (platform: string) => PLATFORM_TEMPLATES[platform]?.color ?? '#E63946';
  const getPlatformGradient = (platform: string) => PLATFORM_TEMPLATES[platform]?.gradient ?? 'from-accent to-red-600';

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-24 pt-10">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-surface/30 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem]">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-accent rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-2xl shadow-accent/30">
            <StickyNote size={36} />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter leading-none mb-3 gradient-text uppercase">
              {activeTab === 'notes' ? 'Anotações' : 'Checklists'}
            </h1>
            <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] opacity-60 italic">
              {activeTab === 'notes' ? 'Banco Neural de Ideias' : 'Pipeline de Postagens'}
            </p>
          </div>
        </div>

        <button
          onClick={() => activeTab === 'notes' ? openNoteModal() : setChecklistModalOpen(true)}
          className="h-16 px-10 bg-accent text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] hover:scale-[1.03] active:scale-[0.97] transition-all shadow-2xl shadow-accent/30 flex items-center gap-3 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          {activeTab === 'notes' ? 'Nova Anotação' : 'Novo Checklist'}
        </button>
      </header>

      {/* TAB SWITCHER */}
      <div className="flex gap-2 p-2 bg-surface/40 backdrop-blur border border-white/5 rounded-3xl w-fit">
        {(['notes', 'checklists'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative flex items-center gap-3 px-7 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300",
              activeTab === tab
                ? "text-white"
                : "text-text-dim hover:text-white"
            )}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="activeNotesTab"
                className="absolute inset-0 bg-accent/20 border border-accent/30 rounded-2xl shadow-[0_0_20px_rgba(230,57,70,0.2)]"
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab === 'notes' ? <><StickyNote size={16} /> Anotações</> : <><CheckSquare size={16} /> Checklists de Vídeo</>}
            </span>
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <AnimatePresence mode="wait">
        {activeTab === 'notes' ? (
          <motion.div
            key="notes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-8"
          >
            {/* SEARCH */}
            <div className="relative group max-w-2xl">
              <div className="absolute inset-0 bg-accent/20 rounded-3xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-accent" size={20} />
                <input
                  type="text"
                  placeholder="BUSCAR ANOTAÇÕES..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-16 bg-surface/50 backdrop-blur-3xl border border-white/5 rounded-3xl pl-16 pr-6 focus:outline-none focus:border-accent transition-all text-xs font-black uppercase tracking-[0.3em] placeholder:opacity-20 shadow-inner"
                />
              </div>
            </div>

            {/* NOTES GRID */}
            {loadingNotes ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="text-accent animate-spin" size={40} />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="bg-surface/20 border-2 border-dashed border-white/5 rounded-[4rem] p-32 text-center">
                <Sparkles size={80} className="mx-auto text-text-dim opacity-10 mb-10" />
                <p className="text-[12px] uppercase font-black tracking-[0.4em] text-text-dim opacity-40 italic px-20 leading-relaxed max-w-2xl mx-auto">
                  Nenhuma anotação encontrada. Crie a sua primeira!
                </p>
                <button
                  onClick={() => openNoteModal()}
                  className="mt-12 text-accent font-black uppercase tracking-[0.4em] text-[10px] hover:gap-6 flex items-center gap-4 mx-auto transition-all"
                >
                  Criar Anotação <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                  {filteredNotes.map(note => (
                    <motion.div
                      key={note.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-surface/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-10 group relative flex flex-col h-full hover:border-accent/30 transition-all duration-300 hover:shadow-[0_0_40px_rgba(230,57,70,0.08)]"
                    >
                      <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-accent border border-white/5">
                            <Hash size={18} />
                          </div>
                          <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] opacity-40">
                            {format(new Date(note.createdAt), 'dd.MM.yyyy', { locale: ptBR })}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                          <button onClick={() => openNoteModal(note)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:text-white text-text-dim border border-white/5 hover:border-accent/40">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setNoteToDelete(note.id)} className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center hover:bg-accent hover:text-white text-accent border border-accent/20 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-2xl font-black mb-4 group-hover:text-white transition-colors uppercase tracking-tight">{note.title}</h3>
                      <div className="text-sm font-bold text-text-dim leading-relaxed whitespace-pre-wrap flex-1 line-clamp-6 opacity-60 group-hover:opacity-100 transition-opacity">
                        {note.content || 'Anotação vazia'}
                      </div>
                      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between opacity-20 group-hover:opacity-40 transition-opacity">
                        <div className="flex gap-2">
                          <div className="w-1 h-1 bg-white rounded-full" />
                          <div className="w-1 h-1 bg-white rounded-full" />
                          <div className="w-1 h-1 bg-white rounded-full" />
                        </div>
                        <div className="text-[8px] font-black uppercase tracking-widest italic">{note.id.substring(0, 8)}</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="checklists"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-6"
          >
            {loadingChecklists ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="text-accent animate-spin" size={40} />
              </div>
            ) : checklists.length === 0 ? (
              <div className="bg-surface/20 border-2 border-dashed border-white/5 rounded-[4rem] p-32 text-center">
                <CheckSquare size={80} className="mx-auto text-text-dim opacity-10 mb-10" />
                <p className="text-[12px] uppercase font-black tracking-[0.4em] text-text-dim opacity-40 italic px-20 leading-relaxed max-w-2xl mx-auto">
                  Nenhum checklist criado. Crie o seu pipeline de postagem!
                </p>
                <button
                  onClick={() => setChecklistModalOpen(true)}
                  className="mt-12 text-accent font-black uppercase tracking-[0.4em] text-[10px] flex items-center gap-4 mx-auto transition-all hover:gap-6"
                >
                  Criar Checklist <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {checklists.map(cl => {
                  const progress = getProgress(cl);
                  const isExpanded = expandedId === cl.id;
                  const platformColor = getPlatformColor(cl.platform);
                  const gradient = getPlatformGradient(cl.platform);
                  const isComplete = progress === 100;

                  return (
                    <motion.div
                      key={cl.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "bg-surface/40 backdrop-blur-2xl border rounded-[2.5rem] overflow-hidden transition-all duration-300",
                        isComplete
                          ? "border-green-500/40 shadow-[0_0_30px_rgba(34,197,94,0.1)]"
                          : "border-white/5 hover:border-white/10"
                      )}
                    >
                      {/* Card Header */}
                      <div className="p-8 flex items-center gap-6">
                        {/* Platform icon */}
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                          style={{ background: `linear-gradient(135deg, ${platformColor}99, ${platformColor}44)`, border: `1px solid ${platformColor}44` }}
                        >
                          <span style={{ color: platformColor }}>{PLATFORM_ICONS[cl.platform]}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span
                              className="text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full"
                              style={{ background: `${platformColor}22`, color: platformColor, border: `1px solid ${platformColor}44` }}
                            >
                              {cl.platform}
                            </span>
                            {isComplete && (
                              <span className="text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                                <Trophy size={10} /> Completo!
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-black text-white truncate tracking-tight">{cl.title}</h3>
                          <p className="text-[10px] text-text-dim opacity-50 font-bold uppercase tracking-widest mt-1">
                            {format(new Date(cl.createdAt), "dd 'de' MMM, yyyy", { locale: ptBR })} · {cl.steps.filter(s => s.done).length}/{cl.steps.length} etapas
                          </p>
                        </div>

                        {/* Progress circle */}
                        <div className="relative shrink-0">
                          <svg width="60" height="60" viewBox="0 0 60 60" className="-rotate-90">
                            <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                            <circle
                              cx="30" cy="30" r="24" fill="none"
                              stroke={isComplete ? '#22c55e' : platformColor}
                              strokeWidth="5"
                              strokeDasharray={`${2 * Math.PI * 24}`}
                              strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress / 100)}`}
                              strokeLinecap="round"
                              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={cn("text-[11px] font-black", isComplete ? "text-green-400" : "text-white")}>{progress}%</span>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setChecklistToDelete(cl.id)}
                            className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent hover:bg-accent hover:text-white border border-accent/20 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : cl.id)}
                            className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-text-dim hover:text-white border border-white/5 transition-all"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="px-8 pb-4">
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className={cn("h-full rounded-full bg-gradient-to-r", gradient)}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                          />
                        </div>
                      </div>

                      {/* Steps (expandable) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-8 pb-8 space-y-3 border-t border-white/5 pt-6">
                              {cl.steps.map((step, idx) => (
                                <motion.button
                                  key={step.id}
                                  onClick={() => handleToggleStep(cl, step.id)}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.04 }}
                                  className={cn(
                                    "w-full flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all duration-200 text-left group",
                                    step.done
                                      ? "bg-green-500/10 border-green-500/20 hover:border-green-500/40"
                                      : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                                  )}
                                >
                                  {/* Checkbox */}
                                  <div className={cn(
                                    "w-7 h-7 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                                    step.done
                                      ? "bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                                      : "border-white/20 group-hover:border-white/40"
                                  )}>
                                    {step.done && (
                                      <motion.svg
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        width="14" height="14" viewBox="0 0 14 14" fill="none"
                                      >
                                        <path d="M2 7l4 4 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                      </motion.svg>
                                    )}
                                  </div>

                                  {/* Step number */}
                                  <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest shrink-0 w-8 text-center",
                                    step.done ? "text-green-400 opacity-70" : "text-text-dim opacity-40"
                                  )}>
                                    {String(idx + 1).padStart(2, '0')}
                                  </span>

                                  {/* Label */}
                                  <span className={cn(
                                    "text-sm font-bold flex-1 transition-all",
                                    step.done ? "text-green-400 line-through opacity-70" : "text-white"
                                  )}>
                                    {step.label}
                                  </span>

                                  {/* XP badge if not done */}
                                  {!step.done && (
                                    <span className="text-[9px] font-black text-accent opacity-50 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                      <Zap size={10} />+10 XP
                                    </span>
                                  )}
                                </motion.button>
                              ))}

                              {isComplete && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="mt-4 p-6 rounded-2xl bg-green-500/10 border border-green-500/20 text-center"
                                >
                                  <Trophy className="mx-auto text-green-400 mb-2" size={28} />
                                  <p className="text-green-400 font-black text-sm uppercase tracking-widest">Checklist Concluído!</p>
                                  <p className="text-green-400/60 text-[10px] font-bold mt-1 uppercase tracking-widest">+60 XP ganhos neste ciclo</p>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======= MODALS ======= */}

      {/* Note Delete Confirmation */}
      <AnimatePresence>
        {noteToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNoteToDelete(null)} className="absolute inset-0 bg-black/80 backdrop-blur-3xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-surface border border-white/10 w-full max-w-md rounded-[3rem] p-12 relative z-10 shadow-2xl text-center">
              <div className="w-20 h-20 bg-accent/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-accent/20">
                <Trash2 className="text-accent" size={36} />
              </div>
              <h2 className="text-3xl font-black mb-3 uppercase tracking-tighter">Apagar Anotação?</h2>
              <p className="text-text-dim text-[11px] font-black uppercase tracking-widest mb-10 opacity-60">Esta ação é permanente.</p>
              <div className="flex gap-4">
                <button onClick={() => setNoteToDelete(null)} className="flex-1 h-16 rounded-2xl bg-white/5 border border-white/5 font-black text-[10px] uppercase tracking-[0.4em] text-text-dim hover:text-white transition-all">Cancelar</button>
                <button onClick={() => handleNoteDelete(noteToDelete)} className="flex-1 h-16 rounded-2xl bg-accent text-white font-black text-[10px] uppercase tracking-[0.4em] hover:bg-accent/90 transition-all shadow-2xl shadow-accent/20">Apagar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checklist Delete Confirmation */}
      <AnimatePresence>
        {checklistToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setChecklistToDelete(null)} className="absolute inset-0 bg-black/80 backdrop-blur-3xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-surface border border-white/10 w-full max-w-md rounded-[3rem] p-12 relative z-10 shadow-2xl text-center">
              <div className="w-20 h-20 bg-accent/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-accent/20">
                <Trash2 className="text-accent" size={36} />
              </div>
              <h2 className="text-3xl font-black mb-3 uppercase tracking-tighter">Remover Checklist?</h2>
              <p className="text-text-dim text-[11px] font-black uppercase tracking-widest mb-10 opacity-60">Todo o progresso será perdido.</p>
              <div className="flex gap-4">
                <button onClick={() => setChecklistToDelete(null)} className="flex-1 h-16 rounded-2xl bg-white/5 border border-white/5 font-black text-[10px] uppercase tracking-[0.4em] text-text-dim hover:text-white transition-all">Cancelar</button>
                <button onClick={() => handleDeleteChecklist(checklistToDelete)} className="flex-1 h-16 rounded-2xl bg-accent text-white font-black text-[10px] uppercase tracking-[0.4em] hover:bg-accent/90 transition-all shadow-2xl shadow-accent/20">Remover</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Note Modal */}
      <AnimatePresence>
        {noteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeNoteModal} className="absolute inset-0 bg-black/80 backdrop-blur-3xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} className="bg-surface border border-white/10 w-full max-w-2xl rounded-[4rem] p-16 relative z-10 shadow-2xl">
              <button onClick={closeNoteModal} className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-text-dim hover:text-white hover:bg-accent/10 transition-all">
                <X size={26} />
              </button>
              <div className="mb-12 text-center">
                <h2 className="text-4xl font-black uppercase tracking-tighter gradient-text leading-none mb-3">
                  {editingNote ? 'Editar Anotação' : 'Nova Anotação'}
                </h2>
                <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] opacity-40 italic">Registre seu pensamento estratégico</p>
              </div>
              <form onSubmit={handleNoteSubmit} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim ml-4 opacity-50">Título</label>
                  <input
                    required
                    value={noteTitle}
                    onChange={e => setNoteTitle(e.target.value)}
                    placeholder="Título da anotação..."
                    className="w-full h-16 bg-bg border border-white/5 rounded-2xl px-8 outline-none focus:border-accent text-sm font-black uppercase tracking-widest placeholder:opacity-20 shadow-inner transition-all"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim ml-4 opacity-50">Conteúdo</label>
                  <textarea
                    required
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                    rows={10}
                    placeholder="Escreva aqui..."
                    className="w-full bg-bg border border-white/5 rounded-[2rem] p-8 outline-none focus:border-accent text-base font-bold resize-none shadow-inner leading-relaxed placeholder:opacity-10 transition-all"
                  />
                </div>
                <button type="submit" disabled={isSubmittingNote} className="w-full h-18 bg-white text-black font-black py-5 rounded-[2rem] uppercase tracking-[0.5em] text-xs hover:bg-white/90 transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3">
                  {isSubmittingNote ? <Loader2 size={24} className="animate-spin" /> : <>{editingNote ? 'Salvar Alterações' : 'Criar Anotação'} <ArrowRight size={20} /></>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checklist Create Modal */}
      <AnimatePresence>
        {checklistModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setChecklistModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-3xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }} className="bg-surface border border-white/10 w-full max-w-2xl rounded-[4rem] p-16 relative z-10 shadow-2xl">
              <button onClick={() => setChecklistModalOpen(false)} className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-text-dim hover:text-white hover:bg-accent/10 transition-all">
                <X size={26} />
              </button>
              <div className="mb-12 text-center">
                <h2 className="text-4xl font-black uppercase tracking-tighter gradient-text leading-none mb-3">Novo Checklist</h2>
                <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] opacity-40 italic">Pipeline de publicação de conteúdo</p>
              </div>

              <form onSubmit={handleCreateChecklist} className="space-y-8">
                {/* Platform Selector */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim ml-4 opacity-50">Plataforma</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(Object.keys(PLATFORM_TEMPLATES) as VideoChecklist['platform'][]).map(p => {
                      const color = getPlatformColor(p);
                      const isSelected = newChecklistPlatform === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewChecklistPlatform(p)}
                          className={cn(
                            "flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-200 font-black text-[11px] uppercase tracking-widest",
                            isSelected ? "text-white shadow-lg" : "border-white/5 text-text-dim hover:border-white/10 hover:text-white"
                          )}
                          style={isSelected ? { background: `${color}22`, border: `1px solid ${color}66`, boxShadow: `0 0 20px ${color}33` } : {}}
                        >
                          <span style={{ color: isSelected ? color : undefined }}>{PLATFORM_ICONS[p]}</span>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim ml-4 opacity-50">Nome do Checklist</label>
                  <input
                    required
                    value={newChecklistTitle}
                    onChange={e => setNewChecklistTitle(e.target.value)}
                    placeholder="Ex: Vídeo de segunda-feira..."
                    className="w-full h-16 bg-bg border border-white/5 rounded-2xl px-8 outline-none focus:border-accent text-sm font-bold placeholder:opacity-20 shadow-inner transition-all"
                  />
                </div>

                {/* Preview steps */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim ml-4 opacity-50">Etapas do Template ({PLATFORM_TEMPLATES[newChecklistPlatform].steps.length} passos)</label>
                  <div className="bg-bg rounded-[2rem] p-6 space-y-2 max-h-48 overflow-y-auto custom-scrollbar border border-white/5">
                    {PLATFORM_TEMPLATES[newChecklistPlatform].steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 text-[12px] text-text-dim font-bold">
                        <span className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0">{i + 1}</span>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={isSubmittingChecklist} className="w-full h-18 bg-white text-black font-black py-5 rounded-[2rem] uppercase tracking-[0.5em] text-xs hover:bg-white/90 transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3">
                  {isSubmittingChecklist ? <Loader2 size={24} className="animate-spin" /> : <>Criar Checklist <Zap size={20} /></>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
