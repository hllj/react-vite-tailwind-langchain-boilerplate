export interface ApiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface ChatRequest {
  messages: ApiMessage[];
  model: string;
}

export interface ChatResponse {
  response: string;
  model: string;
}

export interface ApiError {
  status: number;
  message: string;
}

// Interfaces for streaming responses
export interface StreamingMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isStreaming?: boolean;
  model?: string;
  files?: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  type: 'image' | 'document' | 'other';
  name: string;
  url: string;
  previewUrl?: string;
}
