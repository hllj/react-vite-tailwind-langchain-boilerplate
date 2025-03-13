import { StreamingMessage, FileAttachment } from "../types/api";
import { FileItem } from "../components/FileUpload";
import { 
  addMessage as _addMessage,
  updateLastMessage as _updateLastMessage,
  appendToLastMessage as _appendToLastMessage,
  setIsLoading as _setIsLoading,
  setError as _setError,
  setSelectedModel as _setSelectedModel,
  setUseStreaming as _setUseStreaming,
  toggleUseStreaming as _toggleUseStreaming,
  setSocketConnected as _setSocketConnected,
  setConnectionStatus as _setConnectionStatus,
  updateConnectionStatus as _updateConnectionStatus,
  setSelectedFiles as _setSelectedFiles,
  addSelectedFiles as _addSelectedFiles,
  removeSelectedFile as _removeSelectedFile,
  setShowFileUpload as _setShowFileUpload,
  toggleShowFileUpload as _toggleShowFileUpload,
  addFileToLastMessage as _addFileToLastMessage
} from "./slices/chatSlice";
import { AppDispatch } from "./index";

// Typed wrapper functions for chat actions to provide better TypeScript support
export const chatActions = {
  // Add a new message to the chat
  addMessage: (message: StreamingMessage) => 
    (dispatch: AppDispatch) => {
      dispatch(_addMessage(message));
    },

  // Update the most recent message
  updateLastMessage: (messageUpdate: Partial<StreamingMessage>) => 
    (dispatch: AppDispatch) => {
      dispatch(_updateLastMessage(messageUpdate));
    },

  // Append text to the last message (for streaming)
  appendToLastMessage: (text: string) => 
    (dispatch: AppDispatch) => {
      dispatch(_appendToLastMessage(text));
    },

  // Set loading state
  setIsLoading: (isLoading: boolean) => 
    (dispatch: AppDispatch) => {
      dispatch(_setIsLoading(isLoading));
    },

  // Set error state
  setError: (error: string | null) => 
    (dispatch: AppDispatch) => {
      dispatch(_setError(error));
    },

  // Set selected model
  setSelectedModel: (model: string) => 
    (dispatch: AppDispatch) => {
      dispatch(_setSelectedModel(model));
    },

  // Toggle streaming mode
  setUseStreaming: (useStreaming: boolean) => 
    (dispatch: AppDispatch) => {
      dispatch(_setUseStreaming(useStreaming));
    },

  // Toggle streaming mode
  toggleStreamingMode: () => 
    (dispatch: AppDispatch) => {
      dispatch(_toggleUseStreaming());
    },

  // Set socket connection status
  setSocketConnected: (connected: boolean) => 
    (dispatch: AppDispatch) => {
      dispatch(_setSocketConnected(connected));
    },

  // Set connection status message
  setConnectionStatus: (status: string) => 
    (dispatch: AppDispatch) => {
      dispatch(_setConnectionStatus(status));
    },
    
  // Combined action for updating connection status
  updateConnectionStatus: (connected: boolean, status?: string) => 
    (dispatch: AppDispatch) => {
      dispatch(_updateConnectionStatus({ 
        connected, 
        status 
      }));
    },

  // Set selected files
  setSelectedFiles: (files: FileItem[]) => 
    (dispatch: AppDispatch) => {
      dispatch(_setSelectedFiles(files));
    },

  // Add files to selected files
  addSelectedFiles: (files: FileItem[]) => 
    (dispatch: AppDispatch) => {
      dispatch(_addSelectedFiles(files));
    },

  // Remove file from selected files
  removeSelectedFile: (id: string) => 
    (dispatch: AppDispatch) => {
      dispatch(_removeSelectedFile(id));
    },

  // Toggle file upload visibility
  setShowFileUpload: (show: boolean) => 
    (dispatch: AppDispatch) => {
      dispatch(_setShowFileUpload(show));
    },

  // Toggle file upload visibility
  toggleFileUpload: () => 
    (dispatch: AppDispatch) => {
      dispatch(_toggleShowFileUpload());
    },

  // Add file attachment to last message
  addFileToLastMessage: (file: FileAttachment) => 
    (dispatch: AppDispatch) => {
      dispatch(_addFileToLastMessage(file));
    }
};
