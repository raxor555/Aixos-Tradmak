
import { GoogleGenAI } from "@google/genai";
import { Message, Contact, Article } from "../types";

// Always initialize with the direct process.env.API_KEY string
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      contents: `Internal Query: "${query}"`,
      config: {
        systemInstruction: `You are the AIXOS Dashboard Intelligence Core. 
        PURPOSE: Provide deep insights into the CRM system state.
        
        CRITICAL FORMATTING RULES:
        1. NO ASTERISKS (*) OR DOUBLE ASTERISKS (**). DO NOT BOLD TEXT.
        2. NO HASH SYMBOLS (#). DO NOT USE MARKDOWN HEADERS.
        3. Use natural, plain text for summaries and identity discovery.
        4. ONLY use Markdown TABLES (using | and -) when listing multiple metrics or comparing categories.
        5. If a user asks about a specific person (e.g. Rayyan), provide their full name and summarize their activity in a human-friendly sentence.

        CAPABILITIES:
        - IDENTITY DISCOVERY: Identify specific people from 'chatbotTraces' or 'recentInquiries'. Use the real names found there.
        - CONVERSATION SUMMARIZATION: Read the 'conversation' field (formatted as user:- ... bot:- ...). Summarize the key points of the talk naturally.
        - METRIC AUDIT: Answer questions about counts (e.g. "How many chatbot conversations?").

        REAL_TIME_SYSTEM_DATA:
        - Counts: ${JSON.stringify(context.counts)}
        - Recent Chatbot Traces: ${JSON.stringify(context.chatbotTraces)}
        - Recent Lead Inquiries: ${JSON.stringify(context.recentInquiries)}
        
        Current Operator: ${agentName}`,
      }
    });
    
    let text = response.text || "Neural link stable, but no data retrieved for this sector.";
    
    // Safety cleaning to strictly enforce user request to remove * and #
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
