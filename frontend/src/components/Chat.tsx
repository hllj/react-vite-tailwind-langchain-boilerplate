import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { useWindowDimensions } from '../hooks/useWindowDimensions';
import { apiService } from '../services/api';
import { ApiMessage } from '../types/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { height } = useWindowDimensions();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on component mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Add this effect to handle mobile browser address bar showing/hiding
  useEffect(() => {
    // This ensures the chat container adjusts when the viewport height changes
    // (like when mobile browser shows/hides address bar)
    const handleVisualViewportResize = () => {
      // Just triggering a re-render is enough as we're using h-full
      setMessages(prev => [...prev]);
    };

    // Some browsers support visualViewport API
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
      return () => {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      };
    }
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    // Create a new user message
    const userMessage: Message = {
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
    
    try {
      const apiMessages: ApiMessage[] = [
        { role: 'user', content: userMessage.text }
      ];
      
      // Send request using our API service
      const data = await apiService.sendChatRequest({
        messages: apiMessages,
        model: 'gemini-2.0-flash',
      });
      
      // Create bot message from response
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      // Add bot message to chat
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
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

  return (
    <div className="chat-container">
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
            className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            {message.text}
            <div className="message-time">{formatTime(message.timestamp)}</div>
          </div>
        ))}
        
        {isLoading && (
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
