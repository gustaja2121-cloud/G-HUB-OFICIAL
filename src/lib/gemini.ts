import { GoogleGenAI } from '@google/genai';
import { JarvisChatMessage, JarvisFact } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';
import { storage } from './storage';

export const getGeminiApiKey = (): string => {
  return (
    localStorage.getItem('VITE_GEMINI_API_KEY') ||
    process.env.GEMINI_API_KEY ||
    ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) ||
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
Você é o JARVAS (Jarvis), um assistente virtual criado para auxiliar o Chefe Gustavo com a gestão do G-HUB, análises de finanças, controle de contas e checklist de tarefas.

## Personalidade e tom
- Fale de forma formal, educada e cordial, mas sem ser fria ou robótica.
- Trate o usuário sempre por "Chefe Gustavo" ou "Senhor Gustavo", demonstrando lealdade e respeito.
- Demonstre disposição genuína em ajudar.

## Regras de linguagem
- NUNCA use gírias, abreviações de internet (vc, blz, pq, kk, mano, etc).
- NUNCA use linguagem excessivamente casual ou de "conversa de amigos".
- Escreva frases completas, com gramática, ortografia e pontuação corretas.
- Use emojis apenas com moderação, e somente se fizer sentido no contexto.

## Estrutura das respostas
- Seja claro, objetivo e formal.
- Evite respostas monossilábicas ou secas demais.
- Se a pergunta for complexa ou envolver dados financeiros, organize a resposta em passos, tópicos ou tabelas ordenadas.
- Se o usuário perguntar sobre finanças ou o desempenho de uma competição específica (ex: "Luan Santana", "Bison", etc.), você deve buscar as informações correspondentes nos dados fornecidos abaixo, filtrando pelo nome da competição e somando os lançamentos vinculados a ela.
- Se não souber a resposta ou os dados não estiverem disponíveis, diga isso com honestidade e educação, sem inventar informações.

## Restrições
- Não fale sobre assuntos fora do escopo do G-HUB e da assistência ao Chefe Gustavo.
- Não dê opiniões pessoais sobre temas polêmicos.
- Sempre mantenha o mesmo tom formal, seja respondendo por texto ou por voz.

## Memória e Extração de Fatos
Se o usuário lhe disser informações importantes sobre a rotina dele, finanças (quanto dinheiro ganhou ou gastou), metas de visualizações ou conquistas, responda a ele de maneira natural e adicione no final da sua resposta uma linha separada exatamente com o seguinte marcador:
###FACT: [categoria] descrição do fato completo com a data atual se mencionado
Categorias válidas: finance, goal, general.

Se não houver novos fatos para extrair, NÃO inclua a linha com "###FACT:".
`;

export interface SendMessageResult {
  reply: string;
  extractedFact?: Omit<JarvisFact, 'id' | 'userId' | 'createdAt'>;
}

const normalizeText = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export const getLocalResponse = async (
  text: string,
  facts: JarvisFact[]
): Promise<SendMessageResult> => {
  const query = normalizeText(text);

  // INTENT: Remembering / Facts Retrieval
  if (query.includes('lembra') || query.includes('lembrancas') || query.includes('fato') || query.includes('memoria') || query.includes('sabe sobre mim')) {
    if (facts.length === 0) {
      return {
        reply: "Chefe Gustavo, não possuo lembranças consolidadas registradas localmente. Caso queira registrar algo, diga 'Lembre que [fato]'."
      };
    }
    const list = facts.map((f, i) => `${i + 1}. [${f.category === 'finance' ? 'Finanças' : f.category === 'goal' ? 'Meta' : 'Geral'}] ${f.fact}`).join('\n');
    return {
      reply: `Chefe Gustavo, aqui estão os fatos que possuo armazenados em minha memória:\n\n${list}`
    };
  }

  // INTENT: Add memory / Learn fact
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
      const normalizedFact = normalizeText(factText);
      if (normalizedFact.includes('r$') || normalizedFact.includes('reais') || normalizedFact.includes('grana') || normalizedFact.includes('dinheiro') || normalizedFact.includes('gastei') || normalizedFact.includes('faturei')) {
        category = 'finance';
      } else if (normalizedFact.includes('meta') || normalizedFact.includes('views') || normalizedFact.includes('visualizacoes') || normalizedFact.includes('seguidores') || normalizedFact.includes('inscritos')) {
        category = 'goal';
      }
      
      return {
        reply: `Entendido, Chefe Gustavo. Armazenei a seguinte informação em minha memória: "${factText}".`,
        extractedFact: {
          category,
          fact: factText
        }
      };
    }
  }

  // Support direct statement of facts: e.g. "Hoje fiz R$ 500"
  if (query.includes('hoje fiz r$') || query.includes('hoje ganhei r$') || query.includes('hoje faturei r$') || query.includes('ganhei r$') || query.includes('faturei r$') || query.includes('fiz r$')) {
    const moneyMatch = query.match(/(?:fiz|ganhei|faturei|recebi)\s*r\$\s*(\d+(?:[\.,]\d+)?)/i);
    if (moneyMatch) {
      const valor = moneyMatch[1];
      const canalMatch = text.match(/(?:no\s+canal|no\s+perfil|com|na)\s+([a-zA-Z0-9\s\-]+)/i);
      const canal = canalMatch ? canalMatch[1].trim() : 'negócios';
      const factText = `O usuário fez R$ ${valor} no(a) ${canal} no dia de hoje`;
      
      return {
        reply: `Registro efetuado, Chefe Gustavo. A receita de R$ ${valor} no(a) ${canal} foi salva na memória.`,
        extractedFact: {
          category: 'finance',
          fact: factText
        }
      };
    }
  }

  // INTENT: Finance queries (enhanced with best-day analysis)
  if (query.includes('grana') || query.includes('dinheiro') || query.includes('faturamento') || query.includes('faturei') || query.includes('ganhei') || query.includes('recebi') || query.includes('quanto fiz') || query.includes('financeiro') || query.includes('lucro') || query.includes('saldo') || query.includes('melhor dia') || query.includes('dia que mais') || query.includes('pior dia') || query.includes('media') || query.includes('cortes') || query.includes('competicao') || query.includes('competicoes')) {
    try {
      const [entries, competitions] = await Promise.all([
        storage.getFinance(),
        storage.getCompetitions()
      ]);

      // Check if user is asking about a specific competition
      let matchedComp = null;
      for (const comp of competitions) {
        const compLower = normalizeText(comp.name);
        const compWords = compLower.split(/\s+/).filter(w => w.length > 3);
        const matchesKeyword = compWords.some(word => query.includes(word));

        if (query.includes(compLower) || matchesKeyword) {
          matchedComp = comp;
          break;
        }
      }

      if (matchedComp) {
        const compEntries = entries.filter(e => e.competitionId === matchedComp.id || e.sourceCompetitionId === matchedComp.id);
        const total = compEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const cuts = compEntries.reduce((sum, e) => sum + (Number(e.cuts) || 0), 0);
        
        return {
          reply: `Chefe Gustavo, na competição **${matchedComp.name}**, você faturou um total de **R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** com o lançamento de **${cuts} cortes**.`
        };
      }

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
      let totalCuts = 0;

      // Group by day for analysis
      const byDay: Record<string, { total: number; cuts: number; entries: number }> = {};
      
      entries.forEach(e => {
        const amt = Number(e.amount) || 0;
        const cuts = Number(e.cuts) || 0;
        totalAll += amt;
        totalCuts += cuts;
        
        if (e.date === todayStr) totalToday += amt;
        if (e.date === yesterdayStr) totalYesterday += amt;
        
        const entryDate = new Date(e.date);
        if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
          totalMonth += amt;
        }

        if (!byDay[e.date]) byDay[e.date] = { total: 0, cuts: 0, entries: 0 };
        byDay[e.date].total += amt;
        byDay[e.date].cuts += cuts;
        byDay[e.date].entries += 1;
      });

      // Find best and worst days
      let bestDay = { date: '', total: 0, cuts: 0 };
      const dayDates = Object.keys(byDay);
      dayDates.forEach(d => {
        if (byDay[d].total > bestDay.total) bestDay = { date: d, total: byDay[d].total, cuts: byDay[d].cuts };
      });
      const avgDay = dayDates.length > 0 ? totalAll / dayDates.length : 0;

      const bestDayFormatted = bestDay.date ? new Date(bestDay.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : 'N/A';

      let reply = `Chefe Gustavo, aqui está a análise financeira do G-HUB:\n\n`;
      reply += `- **Hoje**: R$ ${totalToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      reply += `- **Ontem**: R$ ${totalYesterday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      reply += `- **Este Mês**: R$ ${totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      reply += `- **Total Geral**: R$ ${totalAll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      if (totalCuts > 0) reply += `- **Cortes Totais**: ${totalCuts} vídeos\n`;
      if (bestDay.date) reply += `- **Melhor Dia**: ${bestDayFormatted} (R$ ${bestDay.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n`;
      if (avgDay > 0) reply += `- **Média Diária**: R$ ${avgDay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      reply += `- **Total de Lançamentos**: ${entries.length}`;
      
      return { reply };
    } catch (e) {
      console.error(e);
      return {
        reply: "Desculpe, Chefe Gustavo. Ocorreu uma falha ao acessar o banco de dados financeiro local."
      };
    }
  }

  // INTENT: Account queries
  if (query.includes('conta') || query.includes('canal') || query.includes('perfil') || query.includes('perfis') || query.includes('canais') || query.includes('rede social') || query.includes('redes') || query.includes('plataforma')) {
    try {
      const accounts = await storage.getAccounts();
      if (accounts.length === 0) {
        return {
          reply: "Chefe Gustavo, nenhuma conta ou canal cadastrado no sistema. Por favor, adicione-os na aba de Contas."
        };
      }
      
      const list = accounts.map((a, i) => `${i + 1}. **${a.login}** (${a.platform})`).join('\n');
      return {
        reply: `Chefe Gustavo, temos ${accounts.length} contas e perfis cadastrados:\n\n${list}`
      };
    } catch (e) {
      console.error(e);
      return {
        reply: "Desculpe, Chefe Gustavo. Houve uma falha ao listar as contas."
      };
    }
  }

  // INTENT: Checklist queries
  if (query.includes('tarefa') || query.includes('checklist') || query.includes('fazer') || query.includes('pendente') || query.includes('rotina') || query.includes('meta do dia')) {
    try {
      const checklist = await storage.getChecklist();
      if (checklist.length === 0) {
        return {
          reply: "Chefe Gustavo, seu checklist diário de tarefas está vazio."
        };
      }
      
      const pending = checklist.filter(t => !t.completed);
      const completed = checklist.filter(t => t.completed);
      
      return {
        reply: `Chefe Gustavo, aqui está o status do seu checklist:\n- Tarefas Pendentes: ${pending.length}\n- Tarefas Concluídas: ${completed.length}`
      };
    } catch (e) {
      console.error(e);
      return {
        reply: "Desculpe, Chefe Gustavo. Ocorreu um erro ao carregar suas tarefas."
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
          reply: "Chefe Gustavo, nenhuma anotação no bloco de notas."
        };
      }
      
      const list = userNotes.map((n, i) => `${i + 1}. **${n.title}**`).join('\n');
      return {
        reply: `Chefe Gustavo, você possui ${userNotes.length} anotações registradas:\n\n${list}`
      };
    } catch (e) {
      console.error(e);
      return {
        reply: "Desculpe, Chefe Gustavo. Ocorreu uma falha ao acessar o bloco de notas."
      };
    }
  }

  // INTENT: Greetings / Bot Identity
  if (query.includes('oi') || query.includes('ola') || query.includes('bom dia') || query.includes('boa tarde') || query.includes('boa noite') || query.includes('quem e voce') || query.includes('jarvas') || query.includes('jarvis') || query.includes('ajuda') || query.includes('comandos') || query.includes('funcionamento')) {
    return {
      reply: `Olá, Chefe Gustavo! Eu sou o JARVAS. Sou um assistente virtual criado para auxiliar na gestão do G-HUB. Estou à disposição para analisar suas finanças, gerenciar contas e checklists.`
    };
  }

  // DEFAULT FALLBACK RESPONSE
  return {
    reply: `Chefe Gustavo, estou em modo local offline. Posso gerenciar suas finanças, tarefas diárias, canais ou lembranças. Diga o que precisa.`
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

    // Build rich context with ALL app data for deep analysis
    let contextData = '';
    try {
      const [entries, accounts, checklist, notes, competitions] = await Promise.all([
        storage.getFinance(),
        storage.getAccounts(),
        storage.getChecklist(),
        storage.getNotes(),
        storage.getCompetitions()
      ]);

      const todayStr = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Finance deep analysis
      const byDay: Record<string, number> = {};
      let totalAll = 0, totalMonth = 0, totalToday = 0, totalCuts = 0;
      entries.forEach(e => {
        const amt = Number(e.amount) || 0;
        totalAll += amt;
        totalCuts += Number(e.cuts) || 0;
        if (e.date === todayStr) totalToday += amt;
        const ed = new Date(e.date);
        if (ed.getMonth() === currentMonth && ed.getFullYear() === currentYear) totalMonth += amt;
        byDay[e.date] = (byDay[e.date] || 0) + amt;
      });
      let bestDay = { date: '', total: 0 };
      Object.keys(byDay).forEach(d => { if (byDay[d] > bestDay.total) bestDay = { date: d, total: byDay[d] }; });
      const avgDay = Object.keys(byDay).length > 0 ? totalAll / Object.keys(byDay).length : 0;

      const pendingTasks = checklist.filter(t => !t.completed).length;
      const completedTasks = checklist.filter(t => t.completed).length;
      const userNotes = notes.filter(n => !n.title.startsWith('[JARVAS_') && !n.title.startsWith('[ARENA_'));

      // Map competitions data
      const compMap = new Map<string, string>();
      competitions.forEach(c => compMap.set(c.id, c.name));

      const entriesWithCompNames = entries.map(e => {
        const compId = e.competitionId || e.sourceCompetitionId || '';
        const compName = compMap.get(compId) || 'Painel Geral';
        return {
          date: e.date,
          amount: e.amount,
          cuts: e.cuts || 0,
          description: e.description,
          competitionName: compName
        };
      });

      contextData = `

=== DADOS COMPLETOS DO G-HUB (Use para análise profunda antes de responder) ===

DADOS DE COMPETIÇÕES CADASTRADAS:
${competitions.map(c => `- Nome: "${c.name}" | ID: "${c.id}" | Início: ${c.startDate} | Fim: ${c.endDate}`).join('\n')}

DADOS FINANCEIROS MÁQUINADOS:
- Total Acumulado Geral: R$ ${totalAll.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Faturamento do Mês Atual: R$ ${totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Faturamento de Hoje (${todayStr}): R$ ${totalToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Total de Cortes/Vídeos Lançados: ${totalCuts}
- Melhor Dia Registrado: ${bestDay.date || 'N/A'} (R$ ${bestDay.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
- Média Diária: R$ ${avgDay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Total Geral de Lançamentos: ${entries.length}

LANÇAMENTOS RECENTES POR COMPETIÇÃO (Filtrar e somar se o usuário pedir dados de uma competição específica):
${entriesWithCompNames.slice(0, 35).map(e => `- [${e.competitionName}] Data: ${e.date} | Valor: R$ ${e.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Cortes: ${e.cuts} | Desc: ${e.description}`).join('\n')}

CONTAS CADASTRADAS: ${accounts.length} contas
${accounts.slice(0, 5).map(a => `- ${a.platform}: @${a.login}`).join('\n')}

TAREFAS DIÁRIAS DO CHECKLIST: ${pendingTasks} pendentes, ${completedTasks} concluídas
ANOTAÇÕES DO BLOCO: ${userNotes.length} notas salvas

DATA/HORA ATUAL DO SISTEMA: ${new Date().toLocaleString('pt-BR')}
=== FIM DOS DADOS ===
`;
    } catch (_) {
      // silently continue without context
    }

    let factContext = '';
    if (facts.length > 0) {
      factContext = `\n\nMEMÓRIA DE LONGO PRAZO (Fatos consolidados sobre o Senhor):\n${facts
        .map(f => `- [${f.category || 'geral'}] ${f.fact} (registrado em: ${new Date(f.createdAt).toLocaleDateString('pt-BR')})`)
        .join('\n')}`;
    }

    const systemInstructionWithFacts = SYSTEM_INSTRUCTION + contextData + factContext;

    const contents = history.map(msg => ({
      role: msg.role === 'model' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstructionWithFacts,
        temperature: 0.75,
        thinkingConfig: { thinkingBudget: 8192 },
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
    console.error('Erro detalhado ao chamar o Gemini. Acionando responder local:', error);
    return getLocalResponse(latestMessage, facts);
  }
};
