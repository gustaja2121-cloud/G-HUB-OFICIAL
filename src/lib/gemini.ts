import { GoogleGenAI } from '@google/genai';
import { JarvisChatMessage, JarvisFact } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

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

export const sendToJarvas = async (
  apiKey: string,
  history: JarvisChatMessage[],
  facts: JarvisFact[]
): Promise<SendMessageResult> => {
  if (!apiKey) {
    throw new Error('Chave de API do Gemini não fornecida.');
  }

  // Set up the GoogleGenAI instance
  const ai = new GoogleGenAI({ apiKey });

  // Format historical facts into the system prompt
  let factContext = '';
  if (facts.length > 0) {
    factContext = `\n\nFatos conhecidos e lembrados sobre o Senhor:\n${facts
      .map(f => `- [${f.category || 'geral'}] ${f.fact} (registrado em: ${new Date(f.createdAt).toLocaleDateString('pt-BR')})`)
      .join('\n')}`;
  }

  const systemInstructionWithFacts = SYSTEM_INSTRUCTION + factContext;

  // Map our chat history format to the Google GenAI SDK contents format
  // Note: Roles in GenAI contents are typically 'user' or 'model'
  const contents = history.map(msg => ({
    role: msg.role === 'model' ? 'model' as const : 'user' as const,
    parts: [{ text: msg.text }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstructionWithFacts,
        temperature: 0.7,
      }
    });

    const rawReply = response.text || '';
    
    // Parse for ###FACT:
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
      
      // Strip out the FACT marker from the reply shown to the user
      reply = rawReply.replace(/###FACT:\s*\[(finance|goal|general)\]\s*(.*)/gi, '').trim();
    }

    return {
      reply,
      extractedFact
    };
  } catch (error) {
    console.error('Erro ao chamar o Gemini:', error);
    throw error;
  }
};
