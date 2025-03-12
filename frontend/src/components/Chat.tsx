import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { ApiMessage, StreamingMessage } from '../types/api';

export default function Chat() {
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on component mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Setup socket connection
  useEffect(() => {
    // Check connection status every second
    const connectionChecker = setInterval(() => {
      const connected = socketService.isConnected();
      setIsSocketConnected(connected);
      setConnectionStatus(connected ? 'Connected' : 'Disconnected');
    }, 1000);

    // Connect socket
    try {
      socketService.connect();
      
      // Setup socket listeners for streaming
      socketService.onChatStart(() => {
        console.log('[Chat Component] Chat stream starting');
      });
      
      socketService.onChatToken((token) => {
        console.log('[Chat Component] Received token:', token);
        
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          
          if (lastMessage && lastMessage.isStreaming) {
            // Create a new array to ensure React detects the change
            const updatedMessages = [...prev];
            updatedMessages[prev.length - 1] = {
              ...lastMessage,
              text: lastMessage.text + token
            };
            return updatedMessages;
          }
          return prev;
        });
      });
      
      socketService.onChatComplete((data) => {
        console.log('[Chat Component] Chat stream complete');
        
        setMessages(prev => {
          // Create a new array to ensure React detects the change
          const updatedMessages = [...prev];
          const lastMessage = prev[prev.length - 1];
          
          if (lastMessage && lastMessage.isStreaming) {
            updatedMessages[prev.length - 1] = {
              ...lastMessage,
              isStreaming: false,
              model: data.model
            };
          }
          return updatedMessages;
        });
        
        setIsLoading(false);
        inputRef.current?.focus();
      });
      
      socketService.onChatError((data) => {
        console.error('[Chat Component] Chat error:', data);
        
        // Remove any streaming message first
        setMessages(prev => {
          if (prev.length > 0 && prev[prev.length - 1].isStreaming) {
            return prev.slice(0, -1);
          }
          return prev;
        });
        
        // Then add the error message
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: `Sorry, I encountered an error: ${data.message || 'Please try again later.'}`,
            sender: 'bot',
            timestamp: new Date(),
          }
        ]);
        
        setError(data.message || 'Unknown error occurred');
        setIsLoading(false);
      });
      
      return () => {
        clearInterval(connectionChecker);
        socketService.disconnect();
      };
    } catch (error) {
      console.error('[Chat Component] Error setting up socket:', error);
      setIsSocketConnected(false);
      setConnectionStatus('Error: Failed to connect');
      clearInterval(connectionChecker);
    }
  }, []);
  
  // Handle mobile browser address bar showing/hiding
  useEffect(() => {
    const handleVisualViewportResize = () => {
      setMessages(prev => [...prev]);
    };

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener('resize', handleVisualViewportResize);
      return () => {
        viewport.removeEventListener('resize', handleVisualViewportResize);
      };
    }
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    // Create a new user message
    const userMessage: StreamingMessage = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };
    
    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    
    const apiMessages: ApiMessage[] = [
      { role: 'user', content: userMessage.text }
    ];
    
    if (useStreaming && isSocketConnected) {
      console.log('[Chat Component] Using streaming mode');
      
      // Create an empty bot message that will be filled by streaming
      const streamingMessage: StreamingMessage = {
        id: (Date.now() + 1).toString(),
        text: '',
        sender: 'bot',
        timestamp: new Date(),
        isStreaming: true
      };
      
      // Add the streaming message placeholder
      setMessages(prev => [...prev, streamingMessage]);
      
      try {
        // Send request using socket for streaming
        socketService.sendChatRequest(apiMessages, 'gemini-2.0-flash');
      } catch (error) {
        console.error('[Chat Component] Error sending socket message:', error);
        
        // Fall back to non-streaming API
        handleNonStreamingRequest(apiMessages);
      }
    } else {
      console.log('[Chat Component] Using non-streaming mode');
      // Use non-streaming approach
      handleNonStreamingRequest(apiMessages);
    }
  };
  
  const handleNonStreamingRequest = async (apiMessages: ApiMessage[]) => {
    try {
      // Send request using our API service
      const data = await apiService.sendChatRequest({
        messages: apiMessages,
        model: 'gemini-2.0-flash',
      });
      
      // Create bot message from response
      const botMessage: StreamingMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      // Add bot message to chat
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('[Chat Component] Error sending message:', error);
      
      // Add error message
      const errorMessage: StreamingMessage = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, I encountered an error: ${(error as any).message || 'Please try again later.'}`,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setError((error as any).message || 'Unknown error occurred');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const toggleStreamingMode = () => {
    setUseStreaming(prev => !prev);
  };

  return (
    <div className="chat-container">
      <div className="chat-controls flex justify-between items-center mb-2">
        <button 
          onClick={toggleStreamingMode} 
          className={`text-xs px-2 py-1 rounded ${useStreaming ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
        >
          {useStreaming ? 'Streaming Mode: ON' : 'Streaming Mode: OFF'}
        </button>
        
        <div className={`text-xs px-2 py-1 rounded ${
          isSocketConnected 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          Socket: {connectionStatus}
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p className="text-lg">Welcome! Ask me anything.</p>
            <p className="text-sm mt-2">Your conversations will appear here.</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'} ${message.isStreaming ? 'streaming' : ''}`}
          >
            {message.text || ' '}
            {message.isStreaming && (
              <span className="cursor-animation">▌</span>
            )}
            <div className="message-time">{formatTime(message.timestamp)}</div>
          </div>
        ))}
        
        {isLoading && !messages.some(m => m.isStreaming) && (
          <div className="message bot-message typing-indicator">
            <span className="typing-dot" style={{ animationDelay: '0ms' }}></span>
            <span className="typing-dot" style={{ animationDelay: '150ms' }}></span>
            <span className="typing-dot" style={{ animationDelay: '300ms' }}></span>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="text-center text-red-500 dark:text-red-400 py-2 text-sm">
            {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message here..."
            className="chat-input"
            disabled={isLoading}
          />
          <button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || isLoading}
            className={`chat-send-button ${!inputValue.trim() || isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
            aria-label="Send message"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
