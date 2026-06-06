
export enum ScreenType {
  CHAT_LIST = 'CHAT_LIST',
  CHAT_DETAIL = 'CHAT_DETAIL',
  LIVE_STREAM = 'LIVE_STREAM',
  ATTACHMENTS = 'ATTACHMENTS',
  DISCOVERY = 'DISCOVERY',
  SETTINGS = 'SETTINGS',
  CALLING = 'CALLING',
  CONTACTS = 'CONTACTS'
}

export enum ChatCategory {
  ALL = 'ALL',
  GROUPS = 'GROUPS',
  CHANNELS = 'CHANNELS'
}

export type CallType = 'voice' | 'video';

export interface PollData {
  question: string;
  options: { text: string; id: string; votes: number }[];
  isAnonymous: boolean;
}

export interface ChatItem {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  type: 'user' | 'group' | 'channel';
  isOnline?: boolean;
  isVerified?: boolean;
  members?: string[];
}

export interface Message {
  id: string;
  senderId: string;
  text?: string;
  type: 'text' | 'voice' | 'ephemeral' | 'poll' | 'file' | 'image' | 'livestream';
  timestamp: string;
  isMe: boolean;
  status: 'sent' | 'delivered' | 'read';
  ttl?: number;
  voiceDuration?: string;
  transcript?: string;
  poll?: PollData;
  fileName?: string;
  isZipped?: boolean;
  imageUrl?: string;
  imageCaption?: string;
  livestreamRoomId?: string;
  livestreamSenderName?: string;
}

