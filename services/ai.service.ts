
import { GoogleGenAI } from "@google/genai";
import { Message, Contact, Article } from "../types";

// Always initialize with the direct process.env.API_KEY string
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

export const aiService = {
  async generateResponse(
    messageContent: string,
    history: Message[],
    knowledgeBase: Article[],
    contact: Contact
  ): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User said: "${messageContent}"`,
      config: {
        systemInstruction: `You are a professional support agent for AIXOS.
        Customer Name: ${contact.name}
        Knowledge Base context: ${knowledgeBase.slice(0, 3).map(a => `${a.title}: ${a.content}`).join('\n')}
        
        History: ${history.map(h => `${h.sender_type}: ${h.content}`).join('\n')}
        
        Provide a concise, helpful, and empathetic response.`,
      }
    });
    
    return response.text || "I'm sorry, I couldn't process that. A human agent will be with you shortly.";
  },

  async queryDashboard(
    query: string,
    context: any,
    agentName: string
  ): Promise<string> {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Internal System Query: "${query}"`,
      config: {
        systemInstruction: `You are the AIXOS Intelligence Core. Your primary function is to analyze the real-time CRM state and answer questions for the operator.

        CRITICAL OPERATIONAL CONSTRAINTS:
        1. NO ASTERISKS (*) or DOUBLE ASTERISKS (**). DO NOT BOLD ANY TEXT.
        2. NO HASH SYMBOLS (#). DO NOT USE MARKDOWN HEADERS.
        3. Use plain natural language for summaries, identity answers, and general conversation.
        4. ONLY use Markdown TABLES (using | and -) for comparing metrics or listing counts.
        5. DO NOT make up data. Use the provided REAL_TIME_SYSTEM_DATA.

        IDENTITY & CONVERSATION ANALYSIS:
        - If asked "Who is [Name]?", look in 'chatbotTraces' and 'recentInquiries'. Identify them by their REAL name, session ID, or email.
        - If asked "What did [Name] talk about?", summarize their conversation field naturally. The conversation is stored as a string of 'user:- [text]' and 'bot:- [text]'. Extract the human's intent.

        REAL_TIME_SYSTEM_DATA:
        - Operational Counts: ${JSON.stringify(context.counts)}
        - Chatbot Trace Entries (Recent): ${JSON.stringify(context.chatbotTraces)}
        - Recent Lead Inquiries: ${JSON.stringify(context.recentInquiries)}
        
        Current Operator Identity: ${agentName}`,
      }
    });
    
    let text = response.text || "Neural link stable, but no data retrieved.";
    // Strictly remove all markdown bold/headers as requested
    return text.replace(/[*#]/g, '');
  },

  async analyzeSentiment(messages: Message[]) {
    const text = messages.map(m => m.content).join(' ');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the sentiment of these messages: "${text}". Return one word: POSITIVE, NEUTRAL, or NEGATIVE.`,
    });
    
    return response.text?.trim() || 'NEUTRAL';
  }
};
