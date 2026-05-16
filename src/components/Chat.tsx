import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import { ChatMessage, sendMessage } from '../lib/ai';
import { cn } from '../lib/utils';
import { useToast } from './Toast';

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    // Carregar histórico do localStorage
    const saved = localStorage.getItem('gHubChatHistory');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar histórico", e);
      }
    } else {
      // Mensagem inicial de boas-vindas
      setMessages([{
        role: 'assistant',
        content: 'Fala, chefe! G-AI na área. Pronto para dominar as redes hoje? Manda a estratégia que a gente destrincha! 🚀'
      }]);
    }
  }, []);

  useEffect(() => {
    // Salvar no localStorage sempre que mudar
    if (messages.length > 0) {
      localStorage.setItem('gHubChatHistory', JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearHistory = () => {
    if (window.confirm('Tem certeza que deseja apagar o histórico da conversa?')) {
      localStorage.removeItem('gHubChatHistory');
      setMessages([{
        role: 'assistant',
        content: 'Histórico limpo! Bora começar do zero. O que manda? ⚡'
      }]);
      showToast('Histórico apagado', 'success');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newHistory = [...messages, userMessage];
    
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      // Passar o histórico (sem a msg de boas-vindas caso fique muito grande, mas o Pollinations lida bem)
      // Limitando o histórico aos últimos 10 para não pesar
      const contextHistory = newHistory.slice(-10);
      
      const response = await sendMessage(contextHistory.slice(0, -1), userMessage.content);
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      showToast('Erro ao conectar com a IA', 'error');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ops, deu um curto-circuito aqui! 🔌 Tenta de novo em alguns segundos.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-w-4xl mx-auto premium-card p-0 overflow-hidden flex-shrink-0">
      
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50 backdrop-blur-xl z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-glow">
              <Bot className="text-white" size={24} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-surface rounded-full animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              G-AI <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Online</span>
            </h2>
            <p className="text-xs text-text-dim">Assistente Estratégico</p>
          </div>
        </div>
        
        <button 
          onClick={clearHistory}
          className="p-2 text-text-dim hover:text-accent hover:bg-accent/10 rounded-xl transition-all"
          title="Limpar Histórico"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-bg/50">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex gap-4 max-w-[85%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                msg.role === 'user' ? "bg-surface-light border border-white/10" : "bg-accent/20 border border-accent/30 text-accent"
              )}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-lg",
                msg.role === 'user' 
                  ? "bg-accent text-white rounded-tr-sm" 
                  : "bg-surface border border-white/5 text-gray-200 rounded-tl-sm"
              )}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 max-w-[85%] mr-auto"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 bg-accent/20 border border-accent/30 text-accent">
              <Bot size={14} />
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-white/5 rounded-tl-sm flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-text-dim rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-text-dim rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-text-dim rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-surface/50 backdrop-blur-xl">
        <div className="relative flex items-end gap-2 max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem para o G-AI... (Shift + Enter para quebrar linha)"
            className="w-full bg-surface-light border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-sm text-white placeholder:text-text-dim/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 resize-none min-h-[56px] max-h-[120px] custom-scrollbar"
            rows={1}
            disabled={isLoading}
            style={{ height: 'auto' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2.5 bg-accent hover:bg-accent-light text-white rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-accent flex items-center justify-center shadow-glow"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
          </button>
        </div>
      </div>

    </div>
  );
}
