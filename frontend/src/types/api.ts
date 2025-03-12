export interface ApiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
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

// New interfaces for streaming responses
export interface StreamingMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isStreaming?: boolean;
  model?: string;
}
