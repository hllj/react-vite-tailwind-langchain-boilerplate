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
