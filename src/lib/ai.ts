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
    return text || "Ops, me perdi aqui. Pode repetir?";
  } catch (error) {
    console.error("G-AI Engine Error:", error);
    return "Eita, deu um problema de conexão na minha rede neural. Tenta mandar a mensagem de novo, mano! 🔌";
  }
}
