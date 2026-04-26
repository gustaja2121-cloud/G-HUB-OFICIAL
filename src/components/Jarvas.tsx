import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Send, Bot, X, Volume2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { storage } from '../lib/storage';
import { format } from 'date-fns';

type Message = {
  id: string;
  role: 'user' | 'jarvas';
  text: string;
};

type JarvasState = 'idle' | 'listening' | 'processing';

export default function Jarvas() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'jarvas', text: 'Fala chefe! Sempre pronto para te ajudar. O que vamos conquistar hoje? 🔥' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [currentState, setCurrentState] = useState<JarvasState>('idle');
  const chatRef = useRef<HTMLDivElement>(null);

  // Web Speech API references
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition if supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'pt-BR';
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSendMessage(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setCurrentState('idle');
      };

      recognitionRef.current.onend = () => {
        if (currentState === 'listening') {
          setCurrentState('idle');
        }
      };
    }
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      // Try to find a good voice (preferably male/robotic for "Jarvas" or default)
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => v.lang.includes('pt-BR'));
      if (ptVoice) utterance.voice = ptVoice;
      
      utterance.pitch = 0.9;
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const processCommand = async (text: string) => {
    const lowerText = text.toLowerCase();
    const today = format(new Date(), 'yyyy-MM-dd');
    let response = "Desculpe, não entendi o comando. Pode reformular?";

    try {
      // RegEx para Financeiro: "fiz X reais", "ganhei X reais", "adicione X no financeiro"
      const financeRegex = /(?:fiz|ganhei|adicione|coloque|recebi|entrou)\s*(\d+(?:[.,]\d+)?)\s*(?:reais|no financeiro)/i;
      const financeMatch = lowerText.match(financeRegex);

      // RegEx para Cortes Adicionar: "fiz X cortes", "postei X cortes"
      const addCortesRegex = /(?:fiz|postei|adicione|coloque)\s*(\d+)\s*cortes/i;
      const addCortesMatch = lowerText.match(addCortesRegex);

      // RegEx para Cortes Consultar: "quantos cortes fiz", "total de cortes"
      const getCortesRegex = /(?:quantos|total de)\s*cortes/i;

      // RegEx para Notas: "anotar X", "nota X", "lembrete X", "lembrar de X"
      const noteRegex = /(?:anotar|nota|lembrete|lembrar de|anote)\s+(.+)/i;
      const noteMatch = lowerText.match(noteRegex);

      if (financeMatch) {
        const amountStr = financeMatch[1].replace(',', '.');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount)) {
          await storage.saveFinance({
            id: crypto.randomUUID(),
            amount: amount,
            description: 'Registro via Jarvas',
            date: today
          });
          response = `Feito! Adicionei R$ ${amount.toFixed(2)} no seu Livro Razão de hoje. 💰`;
        }
      } else if (addCortesMatch) {
        const qty = parseInt(addCortesMatch[1], 10);
        if (!isNaN(qty)) {
          const clips = await storage.getClips();
          const existingClip = clips.find(c => c.data === today);
          if (existingClip) {
            existingClip.quantidade += qty;
            await storage.saveClip(existingClip);
          } else {
            await storage.saveClip({
              id: crypto.randomUUID(),
              data: today,
              quantidade: qty
            });
          }
          response = `Registrado! Você adicionou ${qty} cortes ao seu log diário. Continue a produção! ✂️`;
        }
      } else if (getCortesRegex.test(lowerText)) {
        const clips = await storage.getClips();
        const todayClip = clips.find(c => c.data === today);
        const qty = todayClip ? todayClip.quantidade : 0;
        response = qty > 0 
          ? `Você fez ${qty} cortes hoje. Continue nessa disciplina que o resultado é certo! 🔥` 
          : `Você ainda não registrou nenhum corte hoje. Vamos trabalhar! 🚀`;
      } else if (noteMatch) {
        const content = noteMatch[1].trim();
        if (content) {
          await storage.saveNote({
            id: crypto.randomUUID(),
            title: content.length > 20 ? content.substring(0, 20) + '...' : content,
            content: content,
            createdAt: new Date().toISOString()
          });
          response = `Anotado chefe! Salvei isso no seu bloco de notas. 📝`;
        }
      } else if (lowerText.includes('olá') || lowerText.includes('oi')) {
         response = 'Olá chefe! Como posso te ajudar hoje?';
      } else if (lowerText.includes('bom dia') || lowerText.includes('boa tarde') || lowerText.includes('boa noite')) {
         response = 'Sempre pronto para a ação! Qual a missão de hoje?';
      }

    } catch (e) {
      console.error(e);
      response = "Houve um erro ao tentar executar esse comando no banco de dados.";
    }

    return response;
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setCurrentState('processing');

    // Process command
    const responseText = await processCommand(text);

    // Simulate thinking delay
    setTimeout(() => {
      const jarvasMsg: Message = { id: crypto.randomUUID(), role: 'jarvas', text: responseText };
      setMessages(prev => [...prev, jarvasMsg]);
      setCurrentState('idle');
      speak(responseText);
    }, 1500);
  };

  const toggleListen = () => {
    if (currentState === 'listening') {
      setCurrentState('idle');
      if (recognitionRef.current) recognitionRef.current.stop();
    } else {
      setCurrentState('listening');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Mic error", e);
          setCurrentState('idle');
        }
      } else {
        alert("O reconhecimento de voz não é suportado pelo seu navegador.");
        setCurrentState('idle');
      }
    }
  };

  const cancelListen = () => {
    setCurrentState('idle');
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  return (
    <div className="max-w-4xl mx-auto h-[80vh] flex flex-col pt-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">JARVAS</h1>
        <div className="w-1.5 h-6 bg-accent" />
        <span className="text-[11px] font-black tracking-[0.3em] text-accent uppercase opacity-80">
          Seu Assistente Inteligente
        </span>
      </div>

      <div className="flex-1 bg-surface border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col relative shadow-premium">
        
        <AnimatePresence mode="wait">
          {currentState === 'idle' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* Chat Area */}
              <div ref={chatRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map((msg) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id}
                    className={cn(
                      "flex items-end gap-4 max-w-[80%]",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    {msg.role === 'jarvas' && (
                      <div className="w-10 h-10 rounded-2xl bg-bg border border-white/5 flex flex-col items-center justify-center text-accent shrink-0 shadow-inner group">
                         <Bot size={18} className="group-hover:animate-pulse" />
                      </div>
                    )}
                    <div className={cn(
                      "px-6 py-4 rounded-3xl text-sm font-bold tracking-wide leading-relaxed shadow-lg",
                      msg.role === 'user' 
                        ? "bg-white text-black rounded-br-sm" 
                        : "bg-white/[0.03] border border-white/5 text-white rounded-bl-sm"
                    )}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Status Bar / Speaker info */}
              {messages.length > 0 && messages[messages.length-1].role === 'jarvas' && (
                <div className="px-8 py-3 bg-white/[0.02] border-t border-white/5 flex items-center gap-3 text-text-dim text-[11px] font-black uppercase tracking-[0.2em]">
                  <Volume2 size={14} className="text-accent" />
                  Jarvas fala com você. Você foca no que importa.
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 bg-bg border-t border-white/5">
                <div className="flex items-center gap-3 bg-surface p-2 rounded-3xl border border-white/5 shadow-inner">
                  <input 
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-transparent px-4 outline-none text-white font-bold placeholder:text-white/20 text-sm"
                  />
                  <button 
                    onClick={toggleListen}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-accent hover:bg-accent/10 transition-colors shrink-0 interactive-button border border-white/5"
                  >
                    <Mic size={20} />
                  </button>
                  <button 
                    onClick={() => handleSendMessage(inputValue)}
                    className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center hover:bg-white/90 transition-colors shrink-0 shadow-lg interactive-button"
                  >
                    <Send size={18} className="ml-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentState === 'listening' && (
            <motion.div 
              key="listening"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface backdrop-blur-md"
            >
              <div className="text-accent text-sm font-black uppercase tracking-[0.3em] mb-12 animate-pulse">Ouvindo...</div>
              
              <div className="relative w-64 h-64 flex items-center justify-center">
                 {/* Decorative circles */}
                 <div className="absolute w-full h-full rounded-full border border-accent/20 animate-ping" style={{ animationDuration: '3s' }} />
                 <div className="absolute w-full h-full rounded-full border border-accent/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                 
                 {/* Wave bars */}
                 <div className="flex items-center gap-2 z-10">
                    {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                      <motion.div 
                        key={i}
                        animate={{ height: [20, h * 15, 20] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                        className="w-3 bg-accent rounded-full shadow-[0_0_15px_rgba(230,57,70,0.6)]"
                      />
                    ))}
                 </div>
              </div>

              <button 
                onClick={cancelListen}
                className="mt-16 w-20 h-20 bg-bg border border-white/5 rounded-full flex flex-col items-center justify-center text-white hover:border-accent/40 transition-all shadow-xl group"
              >
                 <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Mic size={24} className="text-accent" />
                 </div>
              </button>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim mt-4 opacity-60">Fale agora (ou clique para cancelar)</div>
            </motion.div>
          )}

          {currentState === 'processing' && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface backdrop-blur-md"
            >
              <div className="text-accent text-sm font-black uppercase tracking-[0.3em] mb-12 animate-pulse">Processando...</div>
              
              <div className="relative w-64 h-64 flex items-center justify-center">
                 <div className="absolute w-full h-full rounded-full border-t-2 border-accent animate-spin" style={{ animationDuration: '2s' }} />
                 
                 {/* Wave bars (calmer) */}
                 <div className="flex items-center gap-3 z-10">
                    {[1, 2, 3, 2, 1].map((h, i) => (
                      <motion.div 
                        key={i}
                        animate={{ height: [10, h * 10, 10], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        className="w-4 bg-accent rounded-full shadow-[0_0_10px_rgba(230,57,70,0.4)]"
                      />
                    ))}
                 </div>
              </div>

              <div className="mt-16 w-12 h-12 bg-bg border border-white/5 rounded-full flex items-center justify-center text-white shadow-xl">
                 <div className="flex gap-1">
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} className="w-1 h-1 bg-white rounded-full" />
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} className="w-1 h-1 bg-white rounded-full" />
                    <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} className="w-1 h-1 bg-white rounded-full" />
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
