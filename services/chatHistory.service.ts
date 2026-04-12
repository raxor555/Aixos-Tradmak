import { supabase } from './supabase';

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview: string | null;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'ai';
  content: string;
  created_at: string;
}

export const chatHistoryService = {
  /**
   * Create a new chat session
   */
  async createSession(title = 'New Chat'): Promise<ChatSession | null> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ title })
      .select()
      .single();

    if (error) {
      console.error('[ChatHistory] Failed to create session:', error);
      return null;
    }
    return data as ChatSession;
  },

  /**
   * List all chat sessions, most recent first
   */
  async listSessions(): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[ChatHistory] Failed to list sessions:', error);
      return [];
    }
    return (data || []) as ChatSession[];
  },

  /**
   * Fetch all messages for a specific session
   */
  async getSessionMessages(sessionId: string): Promise<ChatMessageRow[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[ChatHistory] Failed to fetch messages:', error);
      return [];
    }
    return (data || []) as ChatMessageRow[];
  },

  /**
   * Add a message to a session and update session metadata
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'ai',
    content: string
  ): Promise<ChatMessageRow | null> {
    // Insert the message
    const { data: msgData, error: msgError } = await supabase
      .from('chat_messages')
      .insert({ session_id: sessionId, role, content })
      .select()
      .single();

    if (msgError) {
      console.error('[ChatHistory] Failed to add message:', msgError);
      return null;
    }

    // Update session metadata (updated_at, preview, count)
    // Get current count
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    await supabase
      .from('chat_sessions')
      .update({
        updated_at: new Date().toISOString(),
        message_count: count || 0,
        last_message_preview: content.substring(0, 100),
      })
      .eq('id', sessionId);

    return msgData as ChatMessageRow;
  },

  /**
   * Update session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ title })
      .eq('id', sessionId);

    if (error) {
      console.error('[ChatHistory] Failed to update title:', error);
    }
  },

  /**
   * Delete a session (messages cascade-delete)
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('[ChatHistory] Failed to delete session:', error);
      return false;
    }
    return true;
  },
};
