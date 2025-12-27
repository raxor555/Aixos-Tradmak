
import { create } from 'zustand';
import { Conversation, Message, Contact, Article } from '../types';
import { supabase } from '../services/supabase';

interface AppState {
  user: any | null;
  agent: any | null;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  contacts: Contact[];
  articles: Article[];
  loading: boolean;
  
  // Actions
  setUser: (user: any) => void;
  setAgent: (agent: any) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSidebarOpen: (open: boolean) => void;
  setConversations: (convs: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  addMessageLocally: (convId: string, message: Message) => void;
  signOut: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  agent: null,
  theme: 'light',
  sidebarOpen: false, // Default closed on mobile
  conversations: [],
  activeConversationId: null,
  contacts: [],
  articles: [],
  loading: true,

  setUser: (user) => set({ user }),
  setAgent: (agent) => set({ agent, theme: agent?.theme || 'light' }),
  setTheme: (theme) => set({ theme }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setConversations: (convs) => set({ conversations: convs }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  addMessageLocally: (convId, message) => set((state) => ({
    conversations: state.conversations.map(c => 
      c.id === convId ? { ...c, last_activity_at: message.created_at } : c
    )
  })),
  signOut: async () => {
    // Fixed: Cast to any to resolve missing signOut method on SupabaseAuthClient type reported by the compiler
    await (supabase.auth as any).signOut();
    set({ user: null, agent: null });
  }
}));
