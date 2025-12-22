
export type SenderType = 'contact' | 'agent' | 'bot' | 'system';
export type MessageType = 'text' | 'image' | 'file' | 'audio';
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  last_seen_at: string;
  tags: string[];
  location?: { city?: string; country?: string };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_id: string;
  content: string;
  message_type: MessageType;
  created_at: string;
  metadata?: {
    ai_generated?: boolean;
    read?: boolean;
  };
}

export interface Conversation {
  id: string;
  status: ConversationStatus;
  priority: number;
  contact_id: string;
  assigned_agent_id?: string;
  subject?: string;
  last_activity_at: string;
  contact?: Contact;
  unread_count: number;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published';
  views: number;
  category: string;
}

export interface InternalChannel {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  created_by: string;
  created_at: string;
  other_member_name?: string; // For 1:1 private chats
}

export interface InternalMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}
