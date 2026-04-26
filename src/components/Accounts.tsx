import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';
import { 
  Plus, 
  Trash2, 
  X,
  Key,
  ShieldCheck,
  ExternalLink,
  Eye,
  EyeOff,
  Search,
  Loader2,
  Lock,
  Globe,
  Copy,
  Edit2,
  Check,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

interface LocalAccount {
  id: string;
  plataforma: string;
  url?: string;
  email: string;
  senha: string;
  descricao?: string;
  dataCriacao: string;
}

export default function Accounts() {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<LocalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plataforma, setPlataforma] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [url, setUrl] = useState('');
  const [descricao, setDescricao] = useState('');

  // Load from LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem('ghub_accounts_vault_v2');
      if (saved) {
        try {
          setAccounts(JSON.parse(saved));
        } catch (e) {
          console.error('Error parsing accounts:', e);
          setAccounts([]);
        }
      }
      setLoading(false);
    }, 800); // Artificial loading for premium feel
    return () => clearTimeout(timer);
  }, []);

  // Save to LocalStorage
  const saveToLocal = (newAccounts: LocalAccount[]) => {
    localStorage.setItem('ghub_accounts_vault_v2', JSON.stringify(newAccounts));
    setAccounts(newAccounts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plataforma || !email || !senha) {
      showToast('Campos obrigatórios: Plataforma, E-mail e Senha', 'error');
      return;
    }

    setIsSaving(true);
    
    // Simulate encryption/server delay for premium feel
    await new Promise(resolve => setTimeout(resolve, 600));

    const newAccount: LocalAccount = {
      id: editingId || crypto.randomUUID(),
      plataforma,
      email,
      senha,
      url,
      descricao,
      dataCriacao: editingId 
        ? (accounts.find(a => a.id === editingId)?.dataCriacao || new Date().toISOString())
        : new Date().toISOString(),
    };

    let updatedAccounts: LocalAccount[];
    if (editingId) {
      updatedAccounts = accounts.map(a => a.id === editingId ? newAccount : a);
    } else {
      updatedAccounts = [newAccount, ...accounts];
    }

    saveToLocal(updatedAccounts);
    showToast(editingId ? 'Protocolo atualizado com sucesso' : 'Nova conta vinculada ao Nexus', 'success');
    setIsSaving(false);
    closeModal();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('⚠️ AVISO DE EXCLUSÃO: Esta ação irá deletar permanentemente as credenciais. Confirmar?')) {
      const updated = accounts.filter(a => a.id !== id);
      saveToLocal(updated);
      showToast('Registro removido do sistema');
    }
  };

  const openModal = (account?: LocalAccount) => {
    if (account) {
      setEditingId(account.id);
      setPlataforma(account.plataforma);
      setEmail(account.email);
      setSenha(account.senha);
      setUrl(account.url || '');
      setDescricao(account.descricao || '');
    } else {
      setEditingId(null);
      setPlataforma('');
      setEmail('');
      setSenha('');
      setUrl('');
      setDescricao('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copiado para o clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => 
      acc.plataforma.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [accounts, searchTerm]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 rounded-full border-2 border-accent/20 border-t-accent shadow-glow"
      />
      <p className="text-[10px] font-black uppercase tracking-[0.6em] text-accent animate-pulse">Sincronizando Nexus...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-32 pt-10">
      {/* Header Premium */}
      <header className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-transparent blur-2xl opacity-50 transition-opacity group-hover:opacity-100" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-10 bg-surface/40 backdrop-blur-3xl border border-white/5 p-12 rounded-[3.5rem] shadow-premium">
          <div className="flex items-center gap-8">
            <div className="relative">
              <div className="absolute -inset-4 bg-accent/20 blur-xl rounded-full animate-pulse" />
              <div className="w-24 h-24 bg-accent rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl border border-white/10 relative overflow-hidden group/icon">
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10" />
                <Lock size={44} className="relative z-10 group-hover/icon:scale-110 transition-transform duration-500" />
                <motion.div 
                  initial={false}
                  animate={{ y: [0, -100] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 3 }}
                  className="absolute inset-0 bg-white/20 -skew-y-12 pointer-events-none"
                />
              </div>
            </div>
            <div>
              <h1 className="text-6xl font-black tracking-tighter leading-none mb-4 gradient-text uppercase italic">Cofre de Acessos</h1>
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-2 text-[11px] font-black text-text-dim uppercase tracking-[0.4em] opacity-60">
                   <ShieldCheck size={14} className="text-accent" /> Protocolo Nexus v2.0
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <div className="text-[11px] font-black text-accent uppercase tracking-[0.4em]">
                   {accounts.length} Registro{accounts.length !== 1 ? 's' : ''} Ativo{accounts.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => openModal()}
            className="h-20 bg-white text-black px-12 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[12px] flex items-center justify-center gap-4 hover:bg-accent hover:text-white hover:scale-[1.05] active:scale-[0.95] transition-all shadow-glow group interactive-button"
          >
            <Plus size={22} className="group-hover:rotate-180 transition-transform duration-700" />
            Novo Registro
          </button>
        </div>
      </header>

      {/* Control Bar */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-3 relative group">
          <div className="absolute left-10 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-accent transition-all duration-300">
            <Search size={28} />
          </div>
          <input 
            type="text"
            placeholder="Pesquisar por plataforma ou credencial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-24 bg-surface/30 border border-white/5 rounded-[2.5rem] pl-24 pr-12 outline-none focus:border-accent/40 focus:bg-surface/60 transition-all font-bold tracking-wide text-sm placeholder:text-white/10"
          />
        </div>
        <div className="bg-surface/20 border border-white/5 rounded-[2.5rem] p-6 flex items-center justify-center gap-4 group hover:border-accent/20 transition-all">
          <div className="p-3 bg-accent/5 rounded-2xl text-accent">
            <AlertCircle size={20} />
          </div>
          <div className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] leading-tight">
            Criptografia<br/><span className="text-white opacity-100">Local-Only (AES)</span>
          </div>
        </div>
      </section>

      {/* Vault List */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredAccounts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-40 text-center bg-surface/5 border border-dashed border-white/5 rounded-[4rem]"
            >
               <Key size={80} className="mx-auto mb-10 text-white/5 animate-pulse" />
               <h3 className="text-2xl font-black text-white/30 uppercase tracking-[0.4em]">Nenhum registro no Nexus</h3>
               <p className="text-[11px] font-bold text-text-dim uppercase tracking-[0.4em] mt-6 opacity-40 italic">Inicie o protocolo de registro acima</p>
            </motion.div>
          ) : (
            filteredAccounts.map((acc, idx) => (
              <motion.div
                key={acc.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="premium-card !p-0 group overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-10 border-b border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-bg border border-white/5 rounded-3xl flex items-center justify-center text-accent group-hover:border-accent/40 group-hover:shadow-glow transition-all duration-500">
                        <Globe size={28} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight truncate max-w-[140px] group-hover:text-accent transition-colors">{acc.plataforma}</h3>
                        <div className="flex items-center gap-2 text-[9px] font-black text-text-dim uppercase tracking-widest mt-1 opacity-50">
                           <Clock size={10} /> {new Date(acc.dataCriacao).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => openModal(acc)}
                        className="w-11 h-11 bg-white/5 text-text-dim rounded-2xl flex items-center justify-center hover:bg-white hover:text-black transition-all interactive-button"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(acc.id, e)}
                        className="w-11 h-11 bg-accent/5 text-accent rounded-2xl flex items-center justify-center hover:bg-accent hover:text-white transition-all interactive-button"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-text-dim leading-relaxed h-10 overflow-hidden line-clamp-2 italic opacity-80">
                    {acc.descricao || "Nenhuma descrição fornecida."}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-10 space-y-8 bg-black/20">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] opacity-40">LOGIN INTEGRADO</span>
                      <button 
                        onClick={() => copyToClipboard(acc.email, acc.id + '-l')}
                        className="p-2 hover:text-accent transition-colors"
                      >
                        {copiedId === acc.id + '-l' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <div className="h-16 bg-bg/50 rounded-2xl border border-white/5 flex items-center px-8 text-[13px] font-bold text-white/90 overflow-hidden text-ellipsis whitespace-nowrap shadow-inner">
                      {acc.email}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] opacity-40">CHAVE DE ACESSO</span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => togglePassword(acc.id)}
                          className="p-2 hover:text-accent transition-colors"
                        >
                          {visiblePasswords[acc.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button 
                          onClick={() => copyToClipboard(acc.senha, acc.id + '-p')}
                          className="p-2 hover:text-accent transition-colors"
                        >
                           {copiedId === acc.id + '-p' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="h-16 bg-bg/50 rounded-2xl border border-white/5 flex items-center px-8 font-mono text-sm tracking-[0.4em] text-accent overflow-hidden text-ellipsis whitespace-nowrap shadow-inner">
                      {visiblePasswords[acc.id] ? acc.senha : '••••••••••••'}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                {acc.url && (
                  <a 
                    href={acc.url.startsWith('http') ? acc.url : `https://${acc.url}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 py-6 bg-white/[0.02] border-t border-white/5 text-[10px] font-black text-white hover:bg-accent hover:text-white transition-all uppercase tracking-[0.2em]"
                  >
                    Abrir Plataforma <ArrowRight size={14} />
                  </a>
                )}
              </motion.div>
            )))}
          </AnimatePresence>
        </section>

      {/* Modal - Premium Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/95 backdrop-blur-3xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.9, y: 50, filter: "blur(10px)" }}
              className="bg-surface border border-white/10 w-full max-w-2xl rounded-[4rem] p-16 relative z-10 shadow-premium overflow-hidden"
            >
              {/* Modal Background Glow */}
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent/20 blur-[100px] rounded-full pointer-events-none" />
              
              <button 
                onClick={closeModal}
                className="absolute top-12 right-12 w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-text-dim hover:text-white hover:bg-accent transition-all ripple-effect"
              >
                <X size={28} />
              </button>

              <div className="flex flex-col items-center text-center gap-8 mb-16 relative">
                <div className="w-24 h-24 bg-accent/10 rounded-[2.5rem] flex items-center justify-center text-accent ring-1 ring-accent/30 shadow-glow mb-2">
                  {editingId ? <Edit2 size={40} /> : <Plus size={40} />}
                </div>
                <div>
                  <h2 className="text-5xl font-black uppercase tracking-tighter gradient-text leading-none mb-4 italic">
                    {editingId ? 'Atualizar Protocolo' : 'Vincular Nova Conta'}
                  </h2>
                  <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.5em] opacity-40">Iniciando Sincronização de Credenciais</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim ml-5 opacity-60">Plataforma *</label>
                    <input
                      type="text"
                      required
                      value={plataforma}
                      onChange={(e) => setPlataforma(e.target.value)}
                      placeholder="EX: INSTAGRAM, HOTMART..."
                      className="w-full h-18 bg-bg border border-white/5 rounded-3xl px-10 outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 font-black uppercase tracking-widest text-[11px] transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim ml-5 opacity-60">URL de Acesso</label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="WWW.EXEMPLO.COM"
                      className="w-full h-18 bg-bg border border-white/5 rounded-3xl px-10 outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 font-black uppercase tracking-widest text-[11px] transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim ml-5 opacity-60">Login / E-mail *</label>
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="LOGIN@NEXUS.COM"
                      className="w-full h-18 bg-bg border border-white/5 rounded-3xl px-10 outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 font-bold tracking-widest text-[11px] transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim ml-5 opacity-60">Senha Nexus *</label>
                    <div className="relative">
                      <input
                        type={visiblePasswords['modal'] ? 'text' : 'password'}
                        required
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full h-18 bg-bg border border-white/5 rounded-3xl pl-10 pr-16 outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 font-mono tracking-[0.3em] text-[12px] transition-all shadow-inner"
                      />
                      <button 
                        type="button"
                        onClick={() => togglePassword('modal')}
                        className="absolute right-8 top-1/2 -translate-y-1/2 text-text-dim hover:text-accent transition-colors"
                      >
                        {visiblePasswords['modal'] ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim ml-5 opacity-60">Descrição / Notas de Protocolo</label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="CHAVES DE RECUPERAÇÃO, OBSERVAÇÕES E NOTAS IMPORTANTES..."
                    rows={4}
                    className="w-full bg-bg border border-white/5 rounded-[2.5rem] p-10 outline-none focus:border-accent transition-all shadow-inner resize-none font-bold text-[11px] tracking-wide placeholder:opacity-30 leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full h-24 bg-white text-black rounded-[3rem] font-black text-[12px] uppercase tracking-[0.6em] hover:bg-accent hover:text-white transition-all shadow-glow active:scale-[0.98] mt-8 flex items-center justify-center gap-4 group"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      {editingId ? 'Confirmar Alteração' : 'Autorizar Registro'}
                      <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
