import { ChatRequest, ChatResponse, ApiError } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async sendChatRequest(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          message: errorData.detail || `HTTP error! status: ${response.status}`,
        } as ApiError;
      }

      return await response.json() as ChatResponse;
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      } else {
        throw {
          status: 0,
          message: `Network error: ${(error as Error).message || 'Unknown error'}`,
        } as ApiError;
      }
    }
  }
}

export const apiService = new ApiService(API_BASE_URL);
