import { useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { Note } from '../types';
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
  Calendar,
  Sparkles,
  ArrowRight,
  Hash,
  Terminal,
  Grid
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

export default function Notes({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const { showToast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const loadNotes = async () => {
    try {
      const data = await storage.getNotes();
      const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotes(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const noteData: Note = {
        id: editingNote ? editingNote.id : crypto.randomUUID(),
        title,
        content,
        createdAt: editingNote ? editingNote.createdAt : new Date().toISOString(),
      };

      await storage.saveNote(noteData);
      showToast(editingNote ? 'Protocolo atualizado no Nexus' : 'Nota neural inicializada', 'success');
      await loadNotes();
      closeModal();
    } catch (error) {
      console.error(error);
      showToast('Erro ao estabilizar rede de notas', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await storage.deleteNote(id);
      showToast('Registro deletado da memória');
      await loadNotes();
      setNoteToDelete(null);
    } catch (error) {
      console.error(error);
      showToast('Erro ao remover registro neuronal', 'error');
    }
  };

  const openModal = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content || '');
    } else {
      setEditingNote(null);
      setTitle('');
      setContent('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNote(null);
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.content?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="text-accent animate-spin" size={40} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 pt-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-surface/30 backdrop-blur-3xl border border-white/5 p-10 rounded-5xl">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-accent rounded-4xl flex items-center justify-center text-white border border-white/10 shadow-2xl shadow-accent/30">
            <StickyNote size={36} />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter leading-none mb-3 gradient-text uppercase">Banco Neural</h1>
            <div className="flex items-center gap-4">
              <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] opacity-60 italic">Repositório Descentralizado de Ideias</p>
              <div className="w-px h-3 bg-white/10" />
               <div className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest">
                  <Terminal size={12} /> {notes.length} Fragmentos
               </div>
            </div>
          </div>
        </div>
        <button 
          onClick={() => openModal()}
          className="h-16 px-10 bg-accent text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] hover:scale-[1.03] active:scale-[0.97] transition-all shadow-2xl shadow-accent/30 flex items-center gap-3 interactive-button group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          Inicializar Nota
        </button>
      </header>

      <div className="relative group max-w-2xl">
        <div className="absolute inset-0 bg-accent/20 rounded-3xl blur-2xl group-focus-within:opacity-100 opacity-0 transition-opacity" />
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-accent" size={20} />
          <input 
            type="text" 
            placeholder="ACESSAR BANCO DE DADOS NEURAL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-16 bg-surface/50 backdrop-blur-3xl border border-white/5 rounded-3xl pl-16 pr-6 focus:outline-none focus:border-accent transition-all text-xs font-black uppercase tracking-[0.3em] placeholder:opacity-20 shadow-inner"
          />
        </div>
      </div>

      {/* Fragments Grid */}
      {filteredNotes.length === 0 ? (
        <div className="bg-surface/20 border-2 border-dashed border-white/5 rounded-[4rem] p-32 text-center">
          <Sparkles size={80} className="mx-auto text-text-dim opacity-10 mb-10" />
          <p className="text-[12px] uppercase font-black tracking-[0.4em] text-text-dim opacity-40 italic px-20 leading-relaxed max-w-2xl mx-auto">Nenhum fragmento neural encontrado no setor atual. Inicialize seu primeiro pensamento estratégico.</p>
          <button 
            onClick={() => openModal()}
            className="mt-12 text-accent font-black uppercase tracking-[0.4em] text-[10px] hover:gap-6 flex items-center gap-4 mx-auto transition-all"
          >
            Executar Criação de Nota <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredNotes.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="premium-card p-10 group relative flex flex-col h-full interactive-button border-b-4 border-accent/0 hover:border-accent transition-all"
              >
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-accent border border-white/5">
                        <Hash size={18} />
                     </div>
                     <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] opacity-40">
                        {format(new Date(note.createdAt), "dd.MM.yyyy", { locale: ptBR })}
                     </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                    <button 
                      onClick={() => openModal(note)} 
                      className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:text-white text-text-dim border border-white/5 hover:border-accent/40"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setNoteToDelete(note.id)} 
                      className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center hover:bg-accent hover:text-white text-accent border border-accent/20 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="text-2xl font-black mb-4 group-hover:text-white transition-colors uppercase tracking-tight">{note.title}</h3>
                <div className="text-sm font-bold text-text-dim leading-relaxed whitespace-pre-wrap flex-1 line-clamp-6 opacity-60 group-hover:opacity-100 transition-opacity">
                  {note.content || 'Buffer de Memória Vazio'}
                </div>
                
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between opacity-20 group-hover:opacity-40 transition-opacity">
                   <div className="flex gap-2">
                       <div className="w-1 h-1 bg-white rounded-full" />
                       <div className="w-1 h-1 bg-white rounded-full" />
                       <div className="w-1 h-1 bg-white rounded-full" />
                   </div>
                   <div className="text-[8px] font-black uppercase tracking-widest italic leading-none">ID Estratégico: {note.id.substring(0, 8)}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Confirmation Architecture */}
      <AnimatePresence>
        {noteToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNoteToDelete(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-3xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface border border-white/10 w-full max-w-md rounded-[3rem] p-12 relative z-10 shadow-premium text-center"
            >
              <div className="w-20 h-20 bg-accent/20 rounded-4xl flex items-center justify-center mx-auto mb-8 border border-accent/20">
                <Trash2 className="text-accent" size={36} />
              </div>
              <h2 className="text-3xl font-black mb-3 uppercase tracking-tighter text-white">Apagar Registro?</h2>
              <p className="text-text-dim text-[11px] font-black uppercase tracking-widest mb-10 opacity-60">Esta ação irá expurgar permanentemente o fragmento da memória neural.</p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setNoteToDelete(null)}
                  className="flex-1 h-16 rounded-2xl bg-white/5 border border-white/5 font-black text-[10px] uppercase tracking-[0.4em] text-text-dim hover:text-white transition-all shadow-inner"
                >
                  Abortar
                </button>
                <button 
                  onClick={() => handleDelete(noteToDelete)}
                  className="flex-1 h-16 rounded-2xl bg-accent text-white font-black text-[10px] uppercase tracking-[0.4em] hover:bg-accent/90 transition-all shadow-2xl shadow-accent/20"
                >
                  Confirmar Expurgo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editor Modal Architecture */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/80 backdrop-blur-3xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-surface border border-white/10 w-full max-w-2xl rounded-[4rem] p-16 relative z-10 shadow-premium"
            >
              <button 
                onClick={closeModal} 
                className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-text-dim hover:text-white hover:bg-accent/10 transition-all"
              >
                <X size={26} />
              </button>

              <div className="mb-12 text-center">
                 <h2 className="text-4xl font-black uppercase tracking-tighter gradient-text leading-none mb-3">
                   {editingNote ? 'Refinar Protocolo' : 'Envio Neural'}
                 </h2>
                 <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] opacity-40 italic">ARQUITETANDO DADOS DO FRAGMENTO</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim ml-4 opacity-50">Título do Protocolo</label>
                  <input 
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="INSIRA A IDENTIDADE DO PROTOCOLO"
                    className="w-full h-18 bg-bg border border-white/5 rounded-2xl px-8 outline-none focus:border-accent text-sm font-black uppercase tracking-widest placeholder:opacity-10 shadow-inner overflow-hidden"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim ml-4 opacity-50">Rede Neural de Conteúdo</label>
                  <textarea 
                    required
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={12}
                    placeholder="INICIALIZAR IMPLANTAÇÃO DE DADOS..."
                    className="w-full bg-bg border border-white/5 rounded-[2.5rem] p-10 outline-none focus:border-accent text-lg font-bold transition-all resize-none shadow-inner leading-relaxed placeholder:opacity-10 placeholder:font-black tracking-tight"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-20 bg-white text-black font-black py-4 rounded-[2rem] uppercase tracking-[0.5em] text-xs hover:bg-white/90 transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 interactive-button"
                >
                  {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : (editingNote ? <>Sincronizar Protocolo <Sparkles size={20} className="fill-current" /></> : <>Implantar Fragmento <ArrowRight size={20} /></>)}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
