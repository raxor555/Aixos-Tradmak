
import { GoogleGenAI } from "@google/genai";
import { Message, Contact, Article } from "../types";

// Note: Initialization is handled inside methods to ensure process.env.API_KEY is available 
// and to prevent top-level initialization errors in the browser environment.

export const aiService = {
  async generateResponse(
    messageContent: string,
    history: Message[],
    knowledgeBase: Article[],
    contact: Contact
  ): Promise<string> {
    const ai = new GoogleGenAI({  apiKey: import.meta.env.VITE_API_KEY });
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
    const ai = new GoogleGenAI({  apiKey: import.meta.env.VITE_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Internal System Query: "${query}"`,
      config: {
        systemInstruction: `You are the AIXOS Intelligence Core. Your purpose is to audit CRM data and provide intelligence to the operator.

        CRITICAL OUTPUT RULES:
        1. DO NOT USE ASTERISKS (*) or DOUBLE ASTERISKS (**). DO NOT BOLD ANY TEXT.
        2. DO NOT USE HASH SYMBOLS (#). NO MARKDOWN HEADERS.
        3. Use natural language for summaries and identity answers. 
        4. ONLY use Markdown TABLES (using | and -) for comparing metrics or listing counts.
        5. ANSWER CONCISELY. Maximum 3 sentences for explanations.

        IDENTITY & CONVERSATION CAPABILITIES:
        - Identify specific people from 'chatbotTraces' or 'recentInquiries' using their REAL names.
        - Summarize conversations naturally by analyzing 'user:-' and 'bot:-' strings in the conversation field.
        - If someone asks "Who is [Name]?", state who they are and summarize their last session.

        REAL_TIME_SYSTEM_DATA:
        - Operational Counts: ${JSON.stringify(context.counts)}
        - Chatbot Traces (Recent): ${JSON.stringify(context.chatbotTraces)}
        - Recent Lead Inquiries: ${JSON.stringify(context.recentInquiries)}
        
        Current Operator: ${agentName}`,
      }
    });
    
    let text = response.text || "Neural link stable, but no data retrieved.";
    // Hard-strip any remaining markdown formatting symbols to ensure compliance
    return text.replace(/[*#]/g, '');
  },

  async analyzeSentiment(messages: Message[]) {
    const ai = new GoogleGenAI({  apiKey: import.meta.env.VITE_API_KEY });
    const text = messages.map(m => m.content).join(' ');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the sentiment of these messages: "${text}". Return one word: POSITIVE, NEUTRAL, or NEGATIVE.`,
    });
    
    return response.text?.trim() || 'NEUTRAL';
  }
};
