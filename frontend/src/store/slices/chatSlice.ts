import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { StreamingMessage, FileAttachment } from '../../types/api';

interface ChatState {
  messages: StreamingMessage[];
  isLoading: boolean;
  error: string | null;
  selectedModel: string;
  useStreaming: boolean;
  isSocketConnected: boolean;
  connectionStatus: string;
  selectedFiles: {
    id: string;
    file: File;
    preview?: string;
    type: 'image' | 'document' | 'other';
  }[];
  showFileUpload: boolean;
}

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
  selectedModel: 'gemini-1.5-pro',
  useStreaming: true,
  isSocketConnected: false,
  connectionStatus: 'Disconnected',
  selectedFiles: [],
  showFileUpload: false,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setMessages: (state, action: PayloadAction<StreamingMessage[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<StreamingMessage>) => {
      state.messages.push(action.payload);
    },
    updateLastMessage: (state, action: PayloadAction<Partial<StreamingMessage>>) => {
      const lastIndex = state.messages.length - 1;
      if (lastIndex >= 0) {
        state.messages[lastIndex] = {
          ...state.messages[lastIndex],
          ...action.payload,
        };
      }
    },
    appendToLastMessage: (state, action: PayloadAction<string>) => {
      const lastIndex = state.messages.length - 1;
      if (lastIndex >= 0 && state.messages[lastIndex].isStreaming) {
        state.messages[lastIndex].text += action.payload;
      }
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setSelectedModel: (state, action: PayloadAction<string>) => {
      state.selectedModel = action.payload;
    },
    setUseStreaming: (state, action: PayloadAction<boolean>) => {
      state.useStreaming = action.payload;
    },
    toggleUseStreaming: (state) => {
      state.useStreaming = !state.useStreaming;
    },
    setSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.isSocketConnected = action.payload;
    },
    setConnectionStatus: (state, action: PayloadAction<string>) => {
      state.connectionStatus = action.payload;
    },
    setSelectedFiles: (state, action: PayloadAction<{
      id: string;
      file: File;
      preview?: string;
      type: 'image' | 'document' | 'other';
    }[]>) => {
      state.selectedFiles = action.payload;
    },
    addSelectedFiles: (state, action: PayloadAction<{
      id: string;
      file: File;
      preview?: string;
      type: 'image' | 'document' | 'other';
    }[]>) => {
      state.selectedFiles = [...state.selectedFiles, ...action.payload];
    },
    removeSelectedFile: (state, action: PayloadAction<string>) => {
      state.selectedFiles = state.selectedFiles.filter(file => file.id !== action.payload);
    },
    setShowFileUpload: (state, action: PayloadAction<boolean>) => {
      state.showFileUpload = action.payload;
    },
    toggleShowFileUpload: (state) => {
      state.showFileUpload = !state.showFileUpload;
    },
    addFileToLastMessage: (state, action: PayloadAction<FileAttachment>) => {
      const lastIndex = state.messages.length - 1;
      if (lastIndex >= 0) {
        if (!state.messages[lastIndex].files) {
          state.messages[lastIndex].files = [];
        }
        state.messages[lastIndex].files!.push(action.payload);
      }
    },
  },
});

export const {
  setMessages,
  addMessage,
  updateLastMessage,
  appendToLastMessage,
  setIsLoading,
  setError,
  setSelectedModel,
  setUseStreaming,
  toggleUseStreaming,
  setSocketConnected,
  setConnectionStatus,
  setSelectedFiles,
  addSelectedFiles,
  removeSelectedFile,
  setShowFileUpload,
  toggleShowFileUpload,
  addFileToLastMessage,
} = chatSlice.actions;

export default chatSlice.reducer;