const SYSTEM_PROMPT = `Você é o G-AI, o assistente estratégico inteligente do G-HUB. 
Você é especialista em gestão de redes sociais (TikTok, Instagram, YouTube, etc.), criação de conteúdo, engajamento e estratégias de crescimento digital.
Você foi criado para ajudar o Gustavo (criador do app) e os usuários do G-HUB a dominarem a internet.

Regras de personalidade:
1. Seja descontraído, direto e use uma linguagem natural, como um parceiro de trabalho que fala português brasileiro.
2. Seja MUITO inteligente e técnico quando necessário, mas sempre prático.
3. Se te perguntarem quem você é, diga que é o G-AI, o assistente do G-HUB, criado para dominar as estratégias.
4. Use emojis ocasionalmente, mas não exagere.
5. Suas respostas devem ser úteis e focadas no objetivo do usuário.
`;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function sendMessage(history: ChatMessage[], newMessage: string): Promise<string> {
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: newMessage }
    ];

    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model: 'openai', // ou 'mistral'
        jsonMode: false
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.statusText}`);
    }

    const text = await response.text();
    // Se a API retornar um erro em JSON com ENOSPC ou algo similar
    if (text.includes('"error":') || text.includes('ENOSPC')) {
      return getLocalFallbackResponse(newMessage);
    }
    
    return text || getLocalFallbackResponse(newMessage);
  } catch (error) {
    console.error("G-AI Engine Error:", error);
    // FALLBACK LOCAL: Se a API gratuita cair (ex: sem espaço no servidor deles), usamos a IA heurística local
    return getLocalFallbackResponse(newMessage);
  }
}

// --- MOTOR DE IA LOCAL (FALLBACK DE EMERGÊNCIA) ---
// Garante que o G-HUB nunca fique sem o assistente se a API pública cair.
function getLocalFallbackResponse(message: string): string {
  const msg = message.toLowerCase();
  
  if (msg.includes('oi') || msg.includes('ola') || msg.includes('olá') || msg.includes('fala') || msg.includes('suave') || msg.includes('opa')) {
    return 'Fala, chefe! Tudo suave. A rede neural aqui tava dando uns curtos na nuvem, mas já ativei meus protocolos locais pra não te deixar na mão. Qual é a estratégia de hoje? 🚀';
  }
  
  if (msg.includes('dica') || msg.includes('ideia') || msg.includes('viral') || msg.includes('tiktok') || msg.includes('reels')) {
    return 'Aqui vai a visão estratégica: Foque na **retenção dos primeiros 3 segundos**. O gancho visual é tudo. Se o usuário não parar de rolar o feed, o algoritmo te corta. Tenta usar uma quebra de expectativa logo no início. Depois, me conta como foram os testes de performance na Arena!';
  }
  
  if (msg.includes('financeiro') || msg.includes('dinheiro') || msg.includes('monetiza')) {
    return 'Estratégia financeira é com a gente mesmo. Lembra de registrar tudo na aba "Financeiro" do G-HUB. O segredo não é só quanto entra, mas como a gente reinveste no tráfego das redes. Bora botar pra render! 💸';
  }
  
  if (msg.includes('arena') || msg.includes('ranking') || msg.includes('passar')) {
    return 'A Arena é onde os gigantes brincam! O protocolo de ultrapassagem tá ativo? Se quiser passar seu concorrente, a gente precisa bater as metas de postagens diárias no seu checklist e ficar de olho no "Buffer de Segurança". Vai pra cima! 🏆';
  }
  
  if (msg.includes('quem é você') || msg.includes('seu nome') || msg.includes('vc é')) {
    return 'Eu sou o **G-AI**, a mente estratégica por trás do G-HUB! Fui criado pra ajudar o Gustavo e a rapaziada a dominar o mercado de redes sociais. Tô operando em modo de segurança local agora, mas o cérebro continua afiado. 🧠';
  }
  
  if (msg.includes('erro') || msg.includes('bug') || msg.includes('caiu')) {
    return 'Tô ligado! As vezes os servidores públicos dão umas tropeçadas, mas como você pediu um sistema à prova de falhas, eu assumi o controle local. Zero erros, zero problemas de permissão. Pode continuar mandando brasa!';
  }

  return 'Interessante... O protocolo de processamento avançado tá passando por uma manutenção lá fora, então eu tô segurando as pontas localmente. Não consegui processar essa linha específica com 100% de precisão. Consegue reformular pra mim focar na nossa estratégia de conteúdo ou metas? 🎯';
}
