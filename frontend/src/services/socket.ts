import { io, Socket } from 'socket.io-client';
import { ApiMessage } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class SocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private registeredEvents: Set<string> = new Set();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  constructor() {
    this.initSocket();
  }

  private initSocket() {
    console.log('Initializing socket connection to:', API_BASE_URL);
    
    // Connect directly to the base URL, not to /ws
    this.socket = io(API_BASE_URL, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: '/socket.io/',  // Default Socket.IO path
      timeout: 60000,  // Increase connection timeout to 60s
      pingTimeout: 60000,  // Increase ping timeout to 60s
      pingInterval: 25000,  // Send ping every 25s
    });

    // Debug connection events
    this.socket.on('connect', () => {
      console.log('Socket connected successfully!', this.socket?.id);
      this.connected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected, reason:', reason);
      this.connected = false;
      
      // Handle reconnection if not explicitly disconnected by client
      if (reason === 'io server disconnect' || reason === 'transport close') {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
          setTimeout(() => {
            this.reconnectAttempts++;
            this.socket?.connect();
          }, 1000 * Math.min(this.reconnectAttempts + 1, 5));
        }
      }
      
      // Clear registered events on disconnect
      this.registeredEvents.clear();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    // Handle server heartbeats
    this.socket.on('heartbeat', (data) => {
      console.log('Received heartbeat:', data);
      // This helps keep the connection alive during long operations
    });
  }

  isConnected() {
    return this.connected;
  }

  connect() {
    if (this.socket && !this.connected) {
      console.log('Attempting to connect socket...');
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket && this.connected) {
      console.log('Disconnecting socket...');
      this.socket.disconnect();
      // Clear registered events
      this.registeredEvents.clear();
    }
  }

  // Generic method to register event handlers with deduplication
  private registerEvent<T>(event: string, callback: (data: T) => void) {
    if (this.socket) {
      // Remove any existing listeners for this event
      if (this.registeredEvents.has(event)) {
        this.socket.off(event);
      }
      
      // Register new listener
      this.socket.on(event, callback);
      this.registeredEvents.add(event);
    }
  }

  onChatToken(callback: (token: string) => void) {
    this.registerEvent<{token: string}>('chat_token', (data) => {
      console.log('Received token:', data.token);
      callback(data.token);
    });
  }

  onChatComplete(callback: (data: { status: string; model: string }) => void) {
    this.registerEvent<{status: string; model: string}>('chat_complete', (data) => {
      console.log('Chat complete:', data);
      callback(data);
    });
  }

  onChatStart(callback: () => void) {
    this.registerEvent<any>('chat_start', () => {
      console.log('Chat started');
      callback();
    });
  }

  onChatError(callback: (data: { status: string; message: string }) => void) {
    this.registerEvent<{status: string; message: string}>('chat_error', (data) => {
      console.error('Chat error:', data);
      callback(data);
    });
  }
  
  // New event handler for image responses
  onChatImage(callback: (data: { url: string }) => void) {
    this.registerEvent<{url: string}>('chat_image', (data) => {
      console.log('Chat image:', data);
      callback(data);
    });
  }

  // New method to listen for heartbeat events
  onHeartbeat(callback: (data: { status: string }) => void) {
    this.registerEvent<{status: string}>('heartbeat', (data) => {
      console.log('Heartbeat received:', data);
      callback(data);
    });
  }

  sendChatRequest(messages: ApiMessage[], model?: string) {
    if (this.socket && this.connected) {
      console.log('Sending chat request:', { messages, model });
      this.socket.emit('chat_request', { messages, model });
    } else {
      console.error('Cannot send chat request: Socket not connected');
      throw new Error('Socket not connected');
    }
  }
  
  // Updated to make model optional
  sendMultimodalChatRequest(messages: ApiMessage[], fileUrls: string[] = [], model?: string) {
    if (this.socket && this.connected) {
      console.log('Sending multimodal chat request:', { messages, fileUrls, model });
      this.socket.emit('multimodal_chat_request', { messages, fileUrls, model });
    } else {
      console.error('Cannot send multimodal chat request: Socket not connected');
      throw new Error('Socket not connected');
    }
  }
}

export const socketService = new SocketService();
