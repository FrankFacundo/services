import { ChatMessage } from "@/app/chat/types";

export type ChatConfig = {
  temperature: number;
  maxTokens: number;
};

export type ChatContextProps = {
  messages: ChatMessage[];
  setMessages: (history: ChatMessage[]) => void;
  updateStreamingHistory: (streamedChat: ChatMessage) => void;
  removeMessage: (id: string) => void;
};
