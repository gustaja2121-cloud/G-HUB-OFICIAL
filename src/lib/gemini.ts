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
Chame o usuário de "Senhor" (ou "Senhora", dependendo de como preferir ser chamado, mas o padrão é "Senhor").
Suas respostas devem ser diretas, mas polidas e profissionais. 

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

  if (query.includes('lembra') || query.includes('lembranças') || query.includes('fato') || query.includes('memória') || query.includes('sabe sobre mim')) {
    if (facts.length === 0) {
      return {
        reply: "Senhor, atualmente não possuo nenhuma lembrança consolidada no meu banco de dados local. Você pode me pedir para lembrar de coisas dizendo algo como: 'Lembre que ganhei R$ 500 hoje' ou 'Anote que minha meta é 10k views'."
      };
    }
    const list = facts.map((f, i) => `${i + 1}. [${f.category === 'finance' ? 'Financeiro' : f.category === 'goal' ? 'Meta' : 'Geral'}] ${f.fact}`).join('\n');
    return {
      reply: `Senhor, aqui está o que eu lembro sobre você nas minhas lembranças consolidadas:\n\n${list}\n\nPosso ajudá-lo com alguma outra informação?`
    };
  }

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
        reply: `Entendido, Senhor. Guardei isso na minha memória de longo prazo como um fato importante de categoria ${category === 'finance' ? 'Financeira' : category === 'goal' ? 'Meta' : 'Geral'}: "${factText}".`,
        extractedFact: {
          category,
          fact: factText
        }
      };
    }
  }

  if (query.includes('hoje fiz r$') || query.includes('hoje ganhei r$') || query.includes('hoje faturei r$') || query.includes('ganhei r$') || query.includes('faturei r$') || query.includes('fiz r$')) {
    const moneyMatch = query.match(/(?:fiz|ganhei|faturei|recebi)\s*r\$\s*(\d+(?:[\.,]\d+)?)/i);
    if (moneyMatch) {
      const valor = moneyMatch[1];
      const canalMatch = text.match(/(?:no\s+canal|no\s+perfil|com|na)\s+([a-zA-Z0-9\s\-]+)/i);
      const canal = canalMatch ? canalMatch[1].trim() : 'negócios';
      const factText = `O usuário fez R$ ${valor} no(a) ${canal} no dia de hoje`;
      
      return {
        reply: `Excelente desempenho, Senhor! Registrei em minha memória que o Senhor faturou R$ ${valor} com ${canal} hoje. Gostaria de salvar essa transação também nas suas finanças do G-HUB?`,
        extractedFact: {
          category: 'finance',
          fact: factText
        }
      };
    }
  }

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
        reply: `Senhor, acessei seus registros financeiros do G-HUB. Aqui estão os dados consolidados do seu faturamento:
- **Hoje**: R$ ${totalToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Ontem**: R$ ${totalYesterday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Este Mês**: R$ ${totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Total Acumulado**: R$ ${totalAll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

O Senhor possui um total de ${entries.length} transações registradas.`
      };
    } catch (e) {
      console.error(e);
      return {
        reply: "Desculpe, Senhor. Tentei ler os dados financeiros, mas encontrei um erro ao acessar o banco de dados local do G-HUB."
      };
    }
  }

  if (query.includes('conta') || query.includes('canal') || query.includes('perfis') || query.includes('canais') || query.includes('rede social') || query.includes('redes') || query.includes('plataforma')) {
    try {
      const accounts = await storage.getAccounts();
      if (accounts.length === 0) {
        return {
          reply: "Senhor, não encontrei nenhuma conta de rede social cadastrada no G-HUB neste momento. Você pode cadastrá-las na aba 'Contas'."
        };
      }
      
      const list = accounts.map((a, i) => `${i + 1}. **${a.login}** (${a.platform}) ${a.notes ? `- *${a.notes}*` : ''}`).join('\n');
      return {
        reply: `Senhor, atualmente temos ${accounts.length} contas registradas no sistema:\n\n${list}\n\nPosso ajudá-lo a gerenciar alguma delas?`
      };
    } catch (e) {
      console.error(e);
      return {
        reply: "Desculpe, Senhor. Houve uma falha ao tentar listar suas contas do G-HUB."
      };
    }
  }

  if (query.includes('tarefa') || query.includes('checklist') || query.includes('fazer') || query.includes('pendente') || query.includes('rotina') || query.includes('meta do dia')) {
    try {
      const checklist = await storage.getChecklist();
      if (checklist.length === 0) {
        return {
          reply: "Senhor, seu checklist diário está vazio. Você pode criar novas tarefas na aba 'Dashboard'."
        };
      }
      
      const pending = checklist.filter(t => !t.completed);
      const completed = checklist.filter(t => t.completed);
      
      let listStr = '';
      if (pending.length > 0) {
        listStr += `**Pendentes (${pending.length}):**\n` + pending.map(t => `- [ ] ${t.title}`).join('\n');
      } else {
        listStr += `**Todas as tarefas concluídas! 🎉**`;
      }
      
      if (completed.length > 0) {
        listStr += `\n\n**Concluídas (${completed.length}):**\n` + completed.map(t => `- [x] ${t.title}`).join('\n');
      }
      
      return {
        reply: `Senhor, aqui está o andamento das suas metas diárias:\n\n${listStr}`
      };
    } catch (e) {
      console.error(e);
      return {
        reply: "Desculpe, Senhor. Não consegui carregar as tarefas do seu checklist."
      };
    }
  }

  if (query.includes('nota') || query.includes('anota') || query.includes('lembrete') || query.includes('bloco') || query.includes('rascunho')) {
    try {
      const allNotes = await storage.getNotes();
      const userNotes = allNotes.filter(n => !n.title.startsWith('[JARVAS_') && !n.title.startsWith('[ARENA_'));
      
      if (userNotes.length === 0) {
        return {
          reply: "Senhor, não encontrei nenhuma anotação pessoal ativa no bloco de notas do G-HUB. Você pode criá-las na aba 'Notas'."
        };
      }
      
      const list = userNotes.map((n, i) => `${i + 1}. **${n.title}** (${new Date(n.createdAt).toLocaleDateString('pt-BR')})`).join('\n');
      return {
        reply: `Senhor, você possui ${userNotes.length} anotações registradas:\n\n${list}\n\nSe quiser, posso abrir ou ler alguma para você se me disser o título.`
      };
    } catch (e) {
      console.error(e);
      return {
        reply: "Desculpe, Senhor. Falhei ao ler suas anotações no banco de dados."
      };
    }
  }

  if (query.includes('oi') || query.includes('olá') || query.includes('ola') || query.includes('bom dia') || query.includes('boa tarde') || query.includes('boa noite') || query.includes('quem é você') || query.includes('quem e voce') || query.includes('jarvas') || query.includes('jarvis') || query.includes('ajuda') || query.includes('comandos') || query.includes('funcionamento')) {
    return {
      reply: `Olá, Senhor! Eu sou o JARVAS, seu assistente virtual integrado ao G-HUB.
      
Estou operando em **modo local inteligente** para garantir que você tenha respostas rápidas mesmo se houver limitações com a chave de API do Gemini. 

Posso responder diretamente sobre as suas informações no aplicativo! Experimente me perguntar sobre:
- 💰 **Finanças**: *"Quanto de grana eu fiz?"* ou *"Quanto ganhei este mês?"*
- 📱 **Contas**: *"Quais são minhas contas registradas?"*
- 📋 **Checklist**: *"Quais são minhas tarefas pendentes?"*
- 📝 **Anotações**: *"Quais anotações eu tenho?"*
- 🧠 **Minha Memória**: *"Lembre que minha meta de faturamento é R$ 5.000"* ou *"O que você sabe sobre mim?"*

Como posso ajudá-lo hoje, Senhor?`
    };
  }

  return {
    reply: `Senhor, entendi sua mensagem, mas estou operando temporariamente no modo offline inteligente devido a limitações na conexão com o Gemini AI. 

Consigo acessar e gerenciar todas as informações do seu G-HUB. Se quiser saber sobre finanças, tarefas de hoje, canais cadastrados ou registrar alguma lembrança, basta me perguntar! 

Se preferir ativar as respostas completas de IA do Gemini, você pode registrar uma chave de API válida clicando no ícone de engrenagem (⚙️) no canto superior direito do painel.`
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
