import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Send, Bot, Volume2, Activity, Check, RefreshCw } from 'lucide-react';
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

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
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
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
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
      const financeRegex = /(?:fiz|ganhei|adicione|coloque|recebi|entrou)\s*(\d+(?:[.,]\d+)?)\s*(?:reais|no financeiro)/i;
      const financeMatch = lowerText.match(financeRegex);

      const addCortesRegex = /(?:fiz|postei|adicione|coloque)\s*(\d+)\s*cortes/i;
      const addCortesMatch = lowerText.match(addCortesRegex);

      const getCortesRegex = /(?:quantos|total de)\s*cortes/i;

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
          response = `Feito! Adicionei R$ ${amount.toFixed(2)} no seu financeiro de hoje.`;
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
          response = `Registrado! Adicionado ${qty} cortes hoje. Continue assim! 🚀`;
        }
      } else if (getCortesRegex.test(lowerText)) {
        const clips = await storage.getClips();
        const todayClip = clips.find(c => c.data === today);
        const qty = todayClip ? todayClip.quantidade : 0;
        response = qty > 0 
          ? `Você fez ${qty} cortes hoje. Continue nessa disciplina que o resultado é certo! 🔥` 
          : `Você ainda não registrou cortes hoje.`;
      } else if (noteMatch) {
        const content = noteMatch[1].trim();
        if (content) {
          await storage.saveNote({
            id: crypto.randomUUID(),
            title: content.length > 20 ? content.substring(0, 20) + '...' : content,
            content: content,
            createdAt: new Date().toISOString()
          });
          response = `Anotado chefe! Salvei no seu bloco de notas. 📝`;
        }
      } else if (lowerText.includes('olá') || lowerText.includes('oi')) {
         response = 'Olá chefe! Como posso te ajudar hoje?';
      } else if (lowerText.includes('bom dia') || lowerText.includes('boa tarde') || lowerText.includes('boa noite')) {
         response = 'Sempre pronto para a ação! Qual a missão de hoje?';
      }

    } catch (e) {
      console.error(e);
      response = "Houve um erro ao tentar executar esse comando.";
    }

    return response;
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setCurrentState('processing');

    const responseText = await processCommand(text);

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
    <div className="max-w-6xl mx-auto h-[85vh] flex flex-col pt-4">
      {/* Header Fiel ao Design */}
      <div className="flex flex-col mb-8 ml-2">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase">JARVAS</h1>
          <Activity className="text-accent mt-1" size={32} />
        </div>
        <span className="text-[10px] font-black tracking-[0.3em] text-accent uppercase mt-1">
          Seu Assistente Inteligente
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        
        {/* Coluna Esquerda: Chat Principal */}
        <div className="flex-1 flex flex-col min-h-0 bg-transparent">
          
          <div className="flex-1 bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden flex flex-col relative shadow-2xl">
            
            <AnimatePresence mode="wait">
              {currentState === 'idle' && (
                <motion.div 
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col h-full"
                >
                  {/* Chat Messages */}
                  <div ref={chatRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {messages.map((msg) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id}
                        className={cn(
                          "flex items-end gap-4 max-w-[85%]",
                          msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                        )}
                      >
                        {msg.role === 'jarvas' && (
                          <div className="w-12 h-12 rounded-full bg-accent/5 border border-accent/30 flex items-center justify-center text-accent shrink-0 shadow-[0_0_15px_rgba(230,57,70,0.1)]">
                             <Bot size={22} />
                          </div>
                        )}
                        <div className={cn(
                          "px-6 py-4 text-[13px] font-medium tracking-wide leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-[#1a1a1a] border border-white/5 text-white/90 rounded-3xl rounded-br-sm" 
                            : "bg-[#141414] border border-white/5 text-white/90 rounded-3xl rounded-bl-sm"
                        )}>
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Input Area */}
                  <div className="p-6 pt-2 bg-[#0a0a0a]">
                    <div className="flex items-center gap-3 bg-[#0d0d0d] p-2 pl-6 rounded-full border border-white/5">
                      <input 
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 bg-transparent outline-none text-white font-medium placeholder:text-white/20 text-sm"
                      />
                      <button 
                        onClick={toggleListen}
                        className="w-12 h-12 rounded-full flex items-center justify-center text-accent hover:bg-accent hover:text-white transition-all shrink-0 border border-accent/20 bg-accent/5"
                      >
                        <Mic size={20} />
                      </button>
                      <button 
                        onClick={() => handleSendMessage(inputValue)}
                        className="w-12 h-12 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center hover:bg-[#2a2a2a] transition-all shrink-0 border border-white/5"
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0a0a]"
                >
                  <div className="text-accent text-sm font-bold tracking-widest mb-16 animate-pulse">Ouvindo...</div>
                  
                  <div className="relative w-72 h-72 flex items-center justify-center">
                     <div className="absolute w-full h-full rounded-full border border-accent/20 animate-ping" style={{ animationDuration: '3s' }} />
                     
                     <div className="flex items-center gap-2.5 z-10">
                        {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                          <motion.div 
                            key={i}
                            animate={{ height: [20, h * 18, 20] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                            className="w-3 bg-accent rounded-full shadow-[0_0_15px_rgba(230,57,70,0.5)]"
                          />
                        ))}
                     </div>
                  </div>

                  <button 
                    onClick={cancelListen}
                    className="mt-20 w-24 h-24 rounded-full flex flex-col items-center justify-center text-white border border-accent/30 hover:bg-accent/5 transition-all group"
                  >
                     <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center group-hover:scale-105 transition-transform shadow-[0_0_20px_rgba(230,57,70,0.4)]">
                        <Mic size={28} className="text-white" />
                     </div>
                  </button>
                  <div className="text-[11px] text-white/40 mt-6">Fale agora</div>
                </motion.div>
              )}

              {currentState === 'processing' && (
                <motion.div 
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0a0a]"
                >
                  <div className="text-accent text-sm font-bold tracking-widest mb-16 animate-pulse">Processando...</div>
                  
                  <div className="relative w-72 h-72 flex items-center justify-center">
                     <div className="absolute w-full h-full rounded-full border border-accent/10" />
                     <div className="absolute w-[60%] h-[60%] rounded-full border-t-2 border-accent animate-spin" style={{ animationDuration: '1.5s' }} />
                     
                     <div className="flex items-center gap-4 z-10 mt-2">
                        {[1, 2, 3].map((_, i) => (
                          <motion.div 
                            key={i}
                            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                            className="w-4 h-4 bg-accent rounded-full shadow-[0_0_10px_rgba(230,57,70,0.5)]"
                          />
                        ))}
                     </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Bar */}
          <div className="mt-6 mx-auto px-8 py-4 bg-[#0a0a0a] border border-white/5 rounded-2xl flex items-center gap-4">
             <Volume2 size={16} className="text-white/40" />
             <span className="text-[11px] font-medium text-white/60 tracking-wider">Jarvas fala com você. Você foca no que importa.</span>
          </div>

        </div>

        {/* Coluna Direita: Painel de Instruções */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
          
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8">
            <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-8">Funcionamento</h3>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                 <Mic size={18} className="text-white/60" />
                 <span className="text-sm text-white/80 font-medium">Clique no microfone</span>
              </div>
              <div className="flex items-center gap-4">
                 <Activity size={18} className="text-white/60" />
                 <span className="text-sm text-white/80 font-medium">Fale o que quiser</span>
              </div>
              <div className="flex items-center gap-4">
                 <RefreshCw size={18} className="text-white/60" />
                 <span className="text-sm text-white/80 font-medium">Jarvas processa</span>
              </div>
              <div className="flex items-center gap-4">
                 <Volume2 size={18} className="text-white/60" />
                 <span className="text-sm text-white/80 font-medium">Jarvas responde por voz</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8">
            <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-8">Recursos</h3>
            
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                 <Check size={16} className="text-accent" />
                 <span className="text-sm text-white/80 font-medium">Interface moderna</span>
              </div>
              <div className="flex items-center gap-4">
                 <Check size={16} className="text-accent" />
                 <span className="text-sm text-white/80 font-medium">Resposta por voz</span>
              </div>
              <div className="flex items-center gap-4">
                 <Check size={16} className="text-accent" />
                 <span className="text-sm text-white/80 font-medium">Animação de áudio</span>
              </div>
              <div className="flex items-center gap-4">
                 <Check size={16} className="text-accent" />
                 <span className="text-sm text-white/80 font-medium">Experiência Imersiva</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
