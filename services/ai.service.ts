
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
    // Call generateContent directly with model and prompt configuration
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User said: "${messageContent}"`,
      config: {
        systemInstruction: `You are a professional support agent for SupportHub.
        Customer Name: ${contact.name}
        Knowledge Base context: ${knowledgeBase.slice(0, 3).map(a => `${a.title}: ${a.content}`).join('\n')}
        
        History: ${history.map(h => `${h.sender_type}: ${h.content}`).join('\n')}
        
        Provide a concise, helpful, and empathetic response.`,
      }
    });
    
    // Access the text property directly (it's not a method)
    return response.text || "I'm sorry, I couldn't process that. A human agent will be with you shortly.";
  },

  async analyzeSentiment(messages: Message[]) {
    const text = messages.map(m => m.content).join(' ');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the sentiment of these messages: "${text}". Return one word: POSITIVE, NEUTRAL, or NEGATIVE.`,
    });
    
    // Access the text property directly
    return response.text?.trim() || 'NEUTRAL';
  }
};
