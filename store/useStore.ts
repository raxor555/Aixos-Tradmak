
import { create } from 'zustand';
import { Conversation, Message, Contact, Article } from '../types';
import { supabase } from '../services/supabase';

interface AppState {
  user: any | null;
  agent: any | null;
  theme: 'light' | 'dark';
  conversations: Conversation[];
  activeConversationId: string | null;
  contacts: Contact[];
  articles: Article[];
  loading: boolean;
  
  // Actions
  setUser: (user: any) => void;
  setAgent: (agent: any) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setConversations: (convs: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  addMessageLocally: (convId: string, message: Message) => void;
  signOut: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  agent: null,
  theme: 'light', // Default set to light mode
  conversations: [],
  activeConversationId: null,
  contacts: [],
  articles: [],
  loading: true,

  setUser: (user) => set({ user }),
  setAgent: (agent) => set({ agent, theme: agent?.theme || 'light' }),
  setTheme: (theme) => set({ theme }),
  setConversations: (convs) => set({ conversations: convs }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  addMessageLocally: (convId, message) => set((state) => ({
    conversations: state.conversations.map(c => 
      c.id === convId ? { ...c, last_activity_at: message.created_at } : c
    )
  })),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, agent: null });
  }
}));
