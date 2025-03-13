import { useRef, useEffect, useState } from 'react';
import { PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/24/solid';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { ApiMessage, FileAttachment } from '../types/api';
import FileUpload, { FileItem } from './FileUpload';
import ModelSelector from './ModelSelector';
import { useAppSelector } from '../hooks/useAppSelector';
import { useChatActions } from '../hooks/useChatActions';
import { v4 as uuidv4 } from 'uuid';

interface ChatProps {}

export default function Chat() {
  const { 
    messages, 
    isLoading, 
    error, 
    selectedModel, 
    useStreaming, 
    isSocketConnected,
    connectionStatus,
    selectedFiles,
    showFileUpload
  } = useAppSelector(state => state.chat);
  const { darkMode } = useAppSelector(state => state.ui);
  
  // Use our custom actions hook
  const chatActions = useChatActions();
  
  const [inputValue, setInputValue] = useState(''); // Keep input as local state
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
      chatActions.setSocketConnected(connected);
      chatActions.setConnectionStatus(connected ? 'Connected' : 'Disconnected');
    }, 1000);

    // Connect socket
    try {
      socketService.connect();
      
      // Setup socket listeners for streaming
      socketService.onChatStart(() => {
        console.log('[Chat Component] Chat stream starting');
      });
      
      // Listen for heartbeats to know the server is still processing
      socketService.onHeartbeat((data) => {
        console.log('[Chat Component] Heartbeat received:', data.status);
        // Reset any disconnection timers or update UI if needed
        if (data.status === 'processing' || data.status === 'generating') {
          chatActions.setIsLoading(true);
        }
      });
      
      socketService.onChatToken((token) => {
        console.log('[Chat Component] Received token:', token);
        chatActions.appendToLastMessage(token);
      });
      
      socketService.onChatComplete((data) => {
        console.log('[Chat Component] Chat stream complete');
        
        chatActions.updateLastMessage({
          isStreaming: false,
          model: data.model
        });
        
        chatActions.setIsLoading(false);
        inputRef.current?.focus();
      });
      
      socketService.onChatError((data) => {
        console.error('[Chat Component] Chat error:', data);
        
        // Add the error message
        chatActions.addMessage({
          id: uuidv4(),
          text: `Sorry, I encountered an error: ${data.message || 'Please try again later.'}`,
          sender: 'bot',
          timestamp: new Date(),
        });
        
        chatActions.setError(data.message || 'Unknown error occurred');
        chatActions.setIsLoading(false);
      });
      
      // Listen for multimodal responses with images
      socketService.onChatImage((imageData) => {
        console.log('[Chat Component] Received image in response:', imageData);
        
        const fileAttachment: FileAttachment = {
          id: `img_${Date.now()}`,
          type: 'image',
          name: 'AI Generated Image',
          url: imageData.url,
          previewUrl: imageData.url
        };
        
        chatActions.addFileToLastMessage(fileAttachment);
      });
      
      return () => {
        clearInterval(connectionChecker);
        socketService.disconnect();
      };
    } catch (error) {
      console.error('[Chat Component] Error setting up socket:', error);
      chatActions.setSocketConnected(false);
      chatActions.setConnectionStatus('Error: Failed to connect');
      clearInterval(connectionChecker);
    }
  }, []); // Removed dependency on dispatch, using memoized functions instead
  
  // Handle mobile browser address bar showing/hiding
  useEffect(() => {
    const handleVisualViewportResize = () => {
      // Just trigger a visual update without actually changing state
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
    };

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener('resize', handleVisualViewportResize);
      return () => {
        viewport.removeEventListener('resize', handleVisualViewportResize);
      };
    }
  }, []);

  const handleFileSelect = (files: FileItem[]) => {
    chatActions.addSelectedFiles(files);
  };

  const handleFileRemove = (id: string) => {
    chatActions.removeSelectedFile(id);
  };

  const handleModelChange = (modelId: string) => {
    chatActions.setSelectedModel(modelId);
  };

  const handleSendMessage = async () => {
    // Don't send if there's no text AND no files
    if ((!inputValue.trim() && selectedFiles.length === 0) || isLoading) return;
    
    chatActions.setIsLoading(true);
    chatActions.setError(null);
    
    try {
      // Process files first if any exist
      let fileAttachments: FileAttachment[] = [];
      let fileUrls: string[] = [];
      
      if (selectedFiles.length > 0) {
        // Upload files and get URLs
        const uploadPromises = selectedFiles.map(async (fileItem) => {
          try {
            const uploadedUrl = await apiService.uploadFile(fileItem.file);
            
            const attachment: FileAttachment = {
              id: fileItem.id,
              type: fileItem.type,
              name: fileItem.file.name,
              url: uploadedUrl,
              previewUrl: fileItem.preview
            };
            
            fileAttachments.push(attachment);
            
            // Only add image URLs to fileUrls for the API
            if (fileItem.type === 'image') {
              fileUrls.push(uploadedUrl);
            }
            
            return attachment;
          } catch (error) {
            console.error(`Failed to upload file ${fileItem.file.name}:`, error);
            throw new Error(`Failed to upload file ${fileItem.file.name}`);
          }
        });
        
        await Promise.all(uploadPromises);
      }
      
      // Create a new user message
      const userMessageId = uuidv4();
      const userMessage = {
        id: userMessageId,
        text: inputValue.trim(),
        sender: 'user' as const,
        timestamp: new Date(),
        files: fileAttachments.length > 0 ? fileAttachments : undefined
      };
      
      // Add user message to chat
      chatActions.addMessage(userMessage);
      setInputValue('');
      
      // Clear file selection
      chatActions.setSelectedFiles([]);
      chatActions.setShowFileUpload(false);
      
      // Determine if this is a multimodal request (has images)
      const isMultimodal = fileUrls.length > 0;
      
      // Create API message array
      const apiMessages: ApiMessage[] = [];
      
      // Add text content if present
      if (userMessage.text) {
        apiMessages.push({
          role: 'user',
          content: userMessage.text
        });
      }
      
      if (useStreaming && isSocketConnected) {
        console.log('[Chat Component] Using streaming mode');
        
        // Create an empty bot message that will be filled by streaming
        const streamingMessage = {
          id: uuidv4(),
          text: '',
          sender: 'bot' as const,
          timestamp: new Date(),
          isStreaming: true,
          model: selectedModel
        };
        
        // Add the streaming message placeholder
        chatActions.addMessage(streamingMessage);
        
        try {
          if (isMultimodal) {
            // Use vision model for multimodal requests
            console.log('[Chat Component] Setting up multimodal request with images:', fileUrls);
            
            // Create a nicer prompt for image analysis if user didn't provide text
            const defaultImagePrompt = "Please analyze this image and describe what you see.";
            
            const multimodalMessages: ApiMessage[] = [
              {
                role: 'user',
                content: isMultimodal ? 
                  [
                    ...fileUrls.map(url => ({
                      type: 'image_url' as const,
                      image_url: { url }
                    })), 
                    {
                      type: 'text' as const,
                      text: userMessage.text || defaultImagePrompt
                    }
                  ] : userMessage.text || defaultImagePrompt
              }
            ];
            
            // Send the request with the selected model
            socketService.sendMultimodalChatRequest(
              multimodalMessages, 
              fileUrls,
              selectedModel
            );
          } else {
            // Use regular chat model for text-only
            socketService.sendChatRequest(
              apiMessages,
              selectedModel
            );
          }
        } catch (error) {
          console.error('[Chat Component] Error sending socket message:', error);
          
          // Fall back to non-streaming API
          handleNonStreamingRequest(apiMessages, fileUrls, isMultimodal);
        }
      } else {
        console.log('[Chat Component] Using non-streaming mode');
        // Use non-streaming approach
        handleNonStreamingRequest(apiMessages, fileUrls, isMultimodal);
      }
    } catch (error) {
      console.error('[Chat Component] Error handling message send:', error);
      chatActions.setError((error as Error).message || 'Failed to process your message');
      chatActions.setIsLoading(false);
    }
  };
  
  const handleNonStreamingRequest = async (
    apiMessages: ApiMessage[], 
    fileUrls: string[] = [],
    isMultimodal: boolean = false
  ) => {
    try {
      // Prepare request based on whether it's multimodal or text-only
      let request: any;
      
      if (isMultimodal) {
        // Create multimodal request with image URLs
        // The first API message should have multimodal content
        const userInput = apiMessages.length > 0 ? 
          apiMessages[0].content as string : 
          'What do you see in this image?';
          
        request = {
          messages: [{
            role: 'user',
            content: [
              ...fileUrls.map(url => ({
                type: 'image_url',
                image_url: { url }
              })),
              {
                type: 'text',
                text: userInput
              }
            ]
          }],
          model: selectedModel, // Use the selected model
        };
      } else {
        // Regular text-only request with selected model
        request = {
          messages: apiMessages,
          model: selectedModel,
        };
      }
      
      // Send request using our API service
      const data = await apiService.sendChatRequest(request);
      
      // Create bot message from response
      chatActions.addMessage({
        id: uuidv4(),
        text: data.response,
        sender: 'bot',
        timestamp: new Date(),
        model: data.model
      });
      
    } catch (error) {
      console.error('[Chat Component] Error sending message:', error);
      
      // Add error message
      chatActions.addMessage({
        id: uuidv4(),
        text: `Sorry, I encountered an error: ${(error as any).message || 'Please try again later.'}`,
        sender: 'bot',
        timestamp: new Date(),
      });
      
      chatActions.setError((error as any).message || 'Unknown error occurred');
    } finally {
      chatActions.setIsLoading(false);
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
    chatActions.toggleStreamingMode();
  };
  
  const toggleFileUpload = () => {
    chatActions.toggleFileUpload();
  };

  // Render file attachments in messages
  const renderFileAttachments = (files: FileAttachment[]) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {files.map(file => (
          <div 
            key={file.id}
            className={`rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 ${
              file.type === 'image' ? 'max-w-[150px]' : 'px-3 py-2'
            }`}
          >
            {file.type === 'image' ? (
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                <img 
                  src={file.previewUrl || file.url} 
                  alt={file.name}
                  className="max-w-full h-auto" 
                />
              </a>
            ) : (
              <a 
                href={file.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <span className="mr-1">📄</span>
                {file.name}
              </a>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="chat-container">
      <div className="chat-controls flex justify-between items-center mb-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={toggleStreamingMode} 
            className={`text-xs px-2 py-1 rounded ${useStreaming ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
          >
            {useStreaming ? 'Streaming Mode: ON' : 'Streaming Mode: OFF'}
          </button>
          
          <button
            onClick={toggleFileUpload}
            className={`text-xs px-2 py-1 rounded ${showFileUpload ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
          >
            {showFileUpload ? 'Hide Files' : 'Add Files'}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-40">
            <ModelSelector 
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
              darkMode={darkMode}
            />
          </div>
          
          <div className={`text-xs px-2 py-1 rounded ${
            isSocketConnected 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            Socket: {connectionStatus}
          </div>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p className="text-lg">Welcome! Ask me anything.</p>
            <p className="text-sm mt-2">Your conversations will appear here.</p>
            <p className="text-sm mt-2">You can also upload images for analysis.</p>
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
            {message.files && message.files.length > 0 && renderFileAttachments(message.files)}
            <div className="flex justify-between items-center message-time">
              <span className="text-xs opacity-70">
                {message.model && message.sender === 'bot' ? `Model: ${message.model}` : ''}
              </span>
              <span>{formatTime(message.timestamp)}</span>
            </div>
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
        {showFileUpload && (
          <div className="mb-3">
            <FileUpload 
              onFileSelect={handleFileSelect}
              selectedFiles={selectedFiles}
              onFileRemove={handleFileRemove}
            />
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleFileUpload}
            className={`flex-shrink-0 p-2.5 rounded-full transition-all duration-200 ${
              showFileUpload 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' 
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'
            }`}
            aria-label="Add files"
            disabled={isLoading}
          >
            <PaperClipIcon className="h-5 w-5" />
          </button>
          
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={selectedFiles.length > 0 
                ? "Add a message or just send the files..." 
                : "Type your message here..."}
              className="chat-input w-full"
              disabled={isLoading}
            />
            
            <button 
              onClick={handleSendMessage} 
              disabled={((!inputValue.trim() && selectedFiles.length === 0) || isLoading)}
              className={`chat-send-button ${(!inputValue.trim() && selectedFiles.length === 0) || isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
              aria-label="Send message"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
