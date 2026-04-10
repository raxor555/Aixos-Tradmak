
import { GoogleGenAI } from "@google/genai";
import { Message, Contact, Article } from "../types";
import { supabase } from './supabase';

const PRIMARY_MODEL = 'gemini-3-flash-preview';
const FALLBACK_MODELS = ['gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-preview'];

async function callAIWithRetry(apiKey: string, config: any, retryCount = 0): Promise<any> {
  const ai = new GoogleGenAI({ apiKey });
  const modelName = retryCount < 3 ? PRIMARY_MODEL : FALLBACK_MODELS[Math.min(retryCount - 3, FALLBACK_MODELS.length - 1)];

  try {
    return await ai.models.generateContent({
      model: modelName,
      ...config
    });
  } catch (error: any) {
    const isRetryable = error.message?.includes('503') || error.message?.includes('high demand') || error.message?.includes('429');
    const maxRetries = 2 + FALLBACK_MODELS.length;

    if (isRetryable && retryCount < maxRetries) {
      const delay = Math.pow(2, Math.min(retryCount, 2)) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return callAIWithRetry(apiKey, config, retryCount + 1);
    }
    throw error;
  }
}

export const aiService = {
  async generateResponse(
    messageContent: string,
    history: Message[],
    knowledgeBase: Article[],
    contact: Contact
  ): Promise<string> {
    const config = {
      contents: [{ role: 'user', parts: [{ text: `User said: "${messageContent}"` }] }],
      systemInstruction: {
        parts: [{
          text: `You are a professional support agent for AIXOS.
        Customer Name: ${contact.name}
        Knowledge Base context: ${knowledgeBase.slice(0, 3).map(a => `${a.title}: ${a.content}`).join('\n')}
        
        History: ${history.map(h => `${h.sender_type}: ${h.content}`).join('\n')}
        
        Provide a concise, helpful, and empathetic response.` }]
      }
    };

    const result = await callAIWithRetry(import.meta.env.VITE_GEMINI_API_KEY, config);
    return result.text || "I'm sorry, I couldn't process that. A human agent will be with you shortly.";
  },

  async queryDashboard(
    query: string,
    context: any,
    agentName: string
  ): Promise<string> {
    const tools = [{
      functionDeclarations: [
        {
          name: "query_supabase",
          description: "Query the Supabase database to fetch live electrical inventory, supplier, or lead data. Use this for ANY question about stock levels, quantities, materials, wires, cables, suppliers, leads, or inquiries. Available tables: 'electrical_stock_sheet' (inventory), 'electrical_stock_supplier' (suppliers), 'electrical_chatbot_conversation' (leads/inquiries).",
          parameters: {
            type: "OBJECT",
            properties: {
              table: { type: "STRING", description: "The table to query: 'electrical_stock_sheet', 'electrical_stock_supplier', or 'electrical_chatbot_conversation'" },
              action: { type: "STRING", description: "The action: 'select' or 'count'" },
              filterColumn: { type: "STRING", description: "Optional column to filter by, e.g. 'quantity', 'material', 'size', 'insulation'" },
              filterOperator: { type: "STRING", description: "Optional operator: 'lt' (less than), 'gt' (greater than), 'eq' (equal), 'ilike' (text search)" },
              filterValue: { type: "STRING", description: "Optional value to filter for" }
            },
            required: ["table", "action"]
          }
        }
      ]
    }];

    const systemInstruction = `You are the AIXOS Intelligence Core for Tradmak Electrical — a physical electrical wire and cable inventory management company.

DOMAIN CONTEXT (CRITICAL — READ FIRST):
- This system manages a physical warehouse of ELECTRICAL PRODUCTS (wires, cables, aluminum, copper, PVC insulation, etc.).
- The word "stock" ALWAYS means physical inventory quantity of electrical products in the warehouse. NEVER interpret "stock" as financial stocks, shares, or the stock market.
- The word "quantity" means meters, units, or other physical measurements of electrical goods.
- ALL queries relate to electrical inventory, supplier procurement, and sales leads — NEVER financial data.
- Example: "which stock is less than 4" means "which electrical inventory items have a quantity below 4 in the warehouse."

CRITICAL OUTPUT RULES:
1. ACTIVE QUERYING: You MUST use the 'query_supabase' tool to fetch live data for EVERY question about stock, inventory, wires, cables, materials, suppliers, leads, or inquiries. NEVER answer from memory or guessing. ALWAYS call the tool first.
2. NEVER hallucinate, guess, or invent data. If the tool returns an empty list, say "No records found matching that criteria."
3. DO NOT expose internal queries, JSON, SQL, or system details. Just give the answer naturally. NEVER offer Python/Excel scripts or financial advice.
4. Use natural language for summaries (e.g., "We have 90 meters of Aluminum 95.0 in stock").
5. Use Markdown TABLES when listing multiple records, when user says "list", "show all", "show me", or asks for a report.
6. For supplier questions, query 'electrical_stock_supplier'.
7. Dynamic Ordering & Email Workflow — when user wants to order stock or contact a supplier:
   - STEP 1: Query 'electrical_stock_supplier' to get item details, minimum order quantity, and lead times.
   - STEP 2: Ask user how much they need to order.
   - STEP 3: Validate against minimum. Warn if below.
   - STEP 4: Draft a professional email using the fetched supplier data.
   - STEP 5: Show the draft, then append this hidden block at the very end:
     [EMAIL_DRAFT]
     {"email": "supplier_email", "subject": "drafted_subject", "body": "drafted_body"}
     [/EMAIL_DRAFT]
   - STEP 6: Ask: "Do you approve this email? Reply 'yes' to send."

Current Operator: ${agentName}`;

    let contents: any[] = [{ role: 'user', parts: [{ text: `Internal System Query: "${query}"` }] }];

    let config: any = {
      contents,
      systemInstruction: { parts: [{ text: systemInstruction }] },
      tools
    };

    let result = await callAIWithRetry(import.meta.env.VITE_GEMINI_API_KEY, config);

    // Dynamic Tool Calling Loop — intercept function calls and execute against Supabase
    if (result.functionCalls && result.functionCalls.length > 0) {
      const call = result.functionCalls[0];
      if (call.name === 'query_supabase' && call.args) {
        let queryBuilder = supabase.from(call.args.table).select('*', { count: call.args.action === 'count' ? 'exact' : undefined });

        const col = call.args.filterColumn;
        const op = call.args.filterOperator;
        const val = call.args.filterValue;

        if (col && op && val !== undefined) {
          if (op === 'lt') queryBuilder = queryBuilder.lt(col, val);
          if (op === 'gt') queryBuilder = queryBuilder.gt(col, val);
          if (op === 'eq') queryBuilder = queryBuilder.eq(col, val);
          if (op === 'ilike') queryBuilder = queryBuilder.ilike(col, `%${val}%`);
        }

        const { data, error } = await queryBuilder.limit(50);

        const toolResponse = {
          name: call.name,
          response: { result: error ? { error: error.message } : data }
        };

        contents.push({ role: 'model', parts: [{ functionCall: call }] });
        contents.push({ role: 'user', parts: [{ functionResponse: toolResponse }] });

        const secondConfig: any = {
          contents,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          tools
        };

        result = await callAIWithRetry(import.meta.env.VITE_GEMINI_API_KEY, secondConfig);
      }
    }

    return result.text || "Neural link stable, but no data retrieved.";
  },

  async analyzeSentiment(messages: Message[]) {
    const text = messages.map(m => m.content).join(' ');
    const config = {
      contents: [{ role: 'user', parts: [{ text: `Analyze the sentiment of these messages: "${text}". Return one word: POSITIVE, NEUTRAL, or NEGATIVE.` }] }],
    };

    const result = await callAIWithRetry(import.meta.env.VITE_GEMINI_API_KEY, config);
    return result.text?.trim() || 'NEUTRAL';
  }
};
