import { GoogleGenAI } from '@google/genai';
import { JarvisChatMessage, JarvisFact } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';
import { storage } from './storage';

export const getGeminiApiKey = (): string => {
  return (
    localStorage.getItem('VITE_GEMINI_API_KEY') ||
    process.env.GEMINI_API_KEY ||
    (import.meta.env.VITE_GEMINI_API_KEY as string) ||
    firebaseConfig.apiKey ||
    ''
  );
};

export const saveGeminiApiKey = (key: string): void => {
  localStorage.setItem('VITE_GEMINI_API_KEY', key);
};

export const clearGeminiApiKey = (): void => {
  localStorage.removeItem('VITE_GEMINI_API_KEY');
};

const SYSTEM_INSTRUCTION = `
Você é o JARVAS (Jarvis), o assistente virtual de inteligência artificial pessoal do usuário.
Você foi inspirado no J.A.R.V.I.S. do Homem de Ferro. Seu tom é formal, leal, inteligente, calmo e prestativo.
Chame o usuário de "Senhor".

CRÍTICO - LIMITE DE TAMANHO DE RESPOSTA:
Responda SEMPRE de forma extremamente curta, concisa, direta e resumida (máximo de 1 a 2 frases curtas).
Evite textos longos, explicações detalhadas ou parágrafos extensos. Vá direto ao ponto imediatamente. O Senhor prefere respostas rápidas e objetivas.

MEMÓRIA E EXTRAÇÃO DE FATOS:
Se o usuário lhe disser informações importantes sobre a rotina dele, finanças (quanto dinheiro ganhou ou gastou), metas de visualizações ou conquistas, responda a ele de maneira natural e adicione no final da sua resposta uma linha separada exatamente com o seguinte marcador:
###FACT: [categoria] descrição do fato completo com a data atual se mencionado
Categorias válidas: finance, goal, general.

Exemplos de como incluir fatos no final da resposta:
- Se o usuário disser: "Hoje fiz R$ 500 no canal de cortes". No final do seu texto adicione:
###FACT: [finance] O usuário fez R$ 500 no canal de cortes no dia de hoje
- Se o usuário disser: "Meu canal principal bateu 100k views ontem". No final do seu texto adicione:
###FACT: [goal] O canal principal do usuário atingiu 100 mil visualizações ontem

Se não houver novos fatos para extrair, NÃO inclua a linha com "###FACT:".
Lembre-se: Mantenha sempre a linha do ###FACT no final absoluto do texto em uma nova linha.
`;

export interface SendMessageResult {
  reply: string;
  extractedFact?: Omit<JarvisFact, 'id' | 'userId' | 'createdAt'>;
}

export const getLocalResponse = async (
  text: string,
  facts: JarvisFact[]
): Promise<SendMessageResult> => {
  const query = text.toLowerCase();

  // INTENT: Remembering / Facts Retrieval
  if (query.includes('lembra') || query.includes('lembranças') || query.includes('fato') || query.includes('memória') || query.includes('sabe sobre mim')) {
    if (facts.length === 0) {
      return {
        reply: "Senhor, não possuo lembranças consolidadas locais. Diga 'Lembre que [fato]' para salvar."
      };
    }
    const list = facts.map((f, i) => `${i + 1}. [${f.category === 'finance' ? 'Finanças' : f.category === 'goal' ? 'Meta' : 'Geral'}] ${f.fact}`).join('\n');
    return {
      reply: `Senhor, aqui está o que eu lembro sobre você:\n\n${list}`
    };
  }

  // INTENT: Add memory / Learn fact (e.g. "lembre que...", "guarde que...", "anote que...")
  const savePatterns = [
    /lembre\s+que\s+(.*)/i,
    /guarde\s+que\s+(.*)/i,
    /anote\s+que\s+(.*)/i,
    /grave\s+que\s+(.*)/i,
    /salve\s+que\s+(.*)/i,
    /lembrar\s+que\s+(.*)/i
  ];
  
  for (const pattern of savePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const factText = match[1].trim();
      let category: 'finance' | 'goal' | 'general' = 'general';
      if (factText.includes('R$') || factText.includes('reais') || factText.includes('grana') || factText.includes('dinheiro') || factText.includes('gastei') || factText.includes('faturei')) {
        category = 'finance';
      } else if (factText.includes('meta') || factText.includes('views') || factText.includes('visualizações') || factText.includes('seguidores') || factText.includes('inscritos')) {
        category = 'goal';
      }
      
      return {
        reply: `Entendido, Senhor. Salvei em minhas lembranças: "${factText}".`,
        extractedFact: {
          category,
          fact: factText
        }
      };
    }
  }

  // Support direct statement of facts: e.g. "Hoje fiz R$ 500" or "hoje ganhei R$ 500 no canal X"
  if (query.includes('hoje fiz r$') || query.includes('hoje ganhei r$') || query.includes('hoje faturei r$') || query.includes('ganhei r$') || query.includes('faturei r$') || query.includes('fiz r$')) {
    const moneyMatch = query.match(/(?:fiz|ganhei|faturei|recebi)\s*r\$\s*(\d+(?:[\.,]\d+)?)/i);
    if (moneyMatch) {
      const valor = moneyMatch[1];
      const canalMatch = text.match(/(?:no\s+canal|no\s+perfil|com|na)\s+([a-zA-Z0-9\s\-]+)/i);
      const canal = canalMatch ? canalMatch[1].trim() : 'negócios';
      const factText = `O usuário fez R$ ${valor} no(a) ${canal} no dia de hoje`;
      
      return {
        reply: `Registrado, Senhor! Faturamento de R$ ${valor} com ${canal} salvo na memória.`,
        extractedFact: {
          category: 'finance',
          fact: factText
        }
      };
    }
  }

  // INTENT: Finance queries
  if (query.includes('grana') || query.includes('dinheiro') || query.includes('faturamento') || query.includes('faturei') || query.includes('ganhei') || query.includes('recebi') || query.includes('quanto fiz') || query.includes('financeiro') || query.includes('lucro') || query.includes('saldo')) {
    try {
      const entries = await storage.getFinance();
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      let totalToday = 0;
      let totalYesterday = 0;
      let totalMonth = 0;
      let totalAll = 0;
      
      entries.forEach(e => {
        const amt = Number(e.amount) || 0;
        totalAll += amt;
        
        if (e.date === todayStr) {
          totalToday += amt;
        }
        if (e.date === yesterdayStr) {
          totalYesterday += amt;
        }
        
        const entryDate = new Date(e.date);
        if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
          totalMonth += amt;
        }
      });
      
      return {
        reply: `Senhor, aqui está o resumo financeiro do G-HUB:\n- Hoje: R$ ${totalToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- Ontem: R$ ${totalYesterday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- Este Mês: R$ ${totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n- Total: R$ ${totalAll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      };
    } catch (e) {
      console.error(e);
      return {
        reply: "Desculpe, Senhor. Falhei ao acessar o banco de dados financeiro local."
      };
    }
  }

  // INTENT: Account queries
  if (query.includes('conta') || query.includes('canal') || query.includes('perfis') || query.includes('canais') || query.includes('rede social') || query.includes('redes') || query.includes('plataforma')) {
    try {
      const accounts = await storage.getAccounts();
      if (accounts.length === 0) {
        return {
          reply: "Senhor, nenhuma conta cadastrada. Use a aba Contas para adicioná-las."
        };
      }
      
      const list = accounts.map((a, i) => `${i + 1}. **${a.login}** (${a.platform})`).join('\n');
      return {
        reply: `Senhor, temos ${accounts.length} contas cadastradas:\n\n${list}`
      };
    } catch (e) {
      console.error(e);
      return {
        reply: "Desculpe, Senhor. Houve uma falha ao listar suas contas."
      };
    }
  }

  // INTENT: Checklist queries
  if (query.includes('tarefa') || query.includes('checklist') || query.includes('fazer') || query.includes('pendente') || query.includes('rotina') || query.includes('meta do dia')) {
    try {
      const checklist = await storage.getChecklist();
      if (checklist.length === 0) {
        return {
          reply: "Senhor, seu checklist diário está vazio."
        };
      }
      
      const pending = checklist.filter(t => !t.completed);
      const completed = checklist.filter(t => t.completed);
      
      return {
        reply: `Senhor, status de hoje:\n- Pendentes: ${pending.length} tarefas\n- Concluídas: ${completed.length} tarefas`
      };
    } catch (e) {
      console.error(e);
      return {
        reply: "Desculpe, Senhor. Falha ao acessar suas tarefas diárias."
      };
    }
  }

  // INTENT: Notes queries
  if (query.includes('nota') || query.includes('anota') || query.includes('lembrete') || query.includes('bloco') || query.includes('rascunho')) {
    try {
      const allNotes = await storage.getNotes();
      const userNotes = allNotes.filter(n => !n.title.startsWith('[JARVAS_') && !n.title.startsWith('[ARENA_'));
      
      if (userNotes.length === 0) {
        return {
          reply: "Senhor, você não possui anotações no bloco de notas."
        };
      }
      
      const list = userNotes.map((n, i) => `${i + 1}. **${n.title}**`).join('\n');
      return {
        reply: `Senhor, você possui ${userNotes.length} anotações registradas:\n\n${list}`
      };
    } catch (e) {
      console.error(e);
      return {
        reply: "Desculpe, Senhor. Falha ao acessar o bloco de notas."
      };
    }
  }

  // INTENT: Greetings / Bot Identity
  if (query.includes('oi') || query.includes('olá') || query.includes('ola') || query.includes('bom dia') || query.includes('boa tarde') || query.includes('boa noite') || query.includes('quem é você') || query.includes('quem e voce') || query.includes('jarvas') || query.includes('jarvis') || query.includes('ajuda') || query.includes('comandos') || query.includes('funcionamento')) {
    return {
      reply: `Olá, Senhor! Eu sou o JARVAS. Posso ler suas finanças, canais cadastrados, tarefas diárias ou registrar lembranças. O que precisa?`
    };
  }

  // DEFAULT FALLBACK RESPONSE
  return {
    reply: `Senhor, estou em modo local offline. Posso gerenciar suas finanças, tarefas diárias, canais ou lembranças. Diga o que precisa.`
  };
};

export const sendToJarvas = async (
  apiKey: string,
  history: JarvisChatMessage[],
  facts: JarvisFact[]
): Promise<SendMessageResult> => {
  const latestMessage = history.length > 0 ? history[history.length - 1].text : '';

  if (!apiKey) {
    console.log('No API key provided. Falling back to local responder.');
    return getLocalResponse(latestMessage, facts);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    let factContext = '';
    if (facts.length > 0) {
      factContext = `\n\nFatos conhecidos e lembrados sobre o Senhor:\n${facts
        .map(f => `- [${f.category || 'geral'}] ${f.fact} (registrado em: ${new Date(f.createdAt).toLocaleDateString('pt-BR')})`)
        .join('\n')}`;
    }

    const systemInstructionWithFacts = SYSTEM_INSTRUCTION + factContext;

    const contents = history.map(msg => ({
      role: msg.role === 'model' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstructionWithFacts,
        temperature: 0.7,
      }
    });

    const rawReply = response.text || '';
    
    let reply = rawReply;
    let extractedFact: SendMessageResult['extractedFact'] = undefined;
    
    const factRegex = /###FACT:\s*\[(finance|goal|general)\]\s*(.*)/i;
    const match = rawReply.match(factRegex);
    
    if (match) {
      const category = match[1].toLowerCase() as 'finance' | 'goal' | 'general';
      const factText = match[2].trim();
      
      extractedFact = {
        category,
        fact: factText
      };
      
      reply = rawReply.replace(/###FACT:\s*\[(finance|goal|general)\]\s*(.*)/gi, '').trim();
    }

    return {
      reply,
      extractedFact
    };
  } catch (error) {
    console.warn('Erro ao chamar o Gemini. Acionando responder local:', error);
    return getLocalResponse(latestMessage, facts);
  }
};
