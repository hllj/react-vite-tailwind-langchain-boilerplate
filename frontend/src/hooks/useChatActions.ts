import { useAppDispatch } from './useAppSelector';
import { chatActions } from '../store/chatActions';
import { useCallback } from 'react';
import { StreamingMessage, FileAttachment } from '../types/api';
import { FileItem } from '../components/FileUpload';

/**
 * Hook to provide chat actions with proper type-safety
 */
export const useChatActions = () => {
  const dispatch = useAppDispatch();
  
  return {
    addMessage: useCallback(
      (message: StreamingMessage) => dispatch(chatActions.addMessage(message)),
      [dispatch]
    ),
    
    updateLastMessage: useCallback(
      (messageUpdate: Partial<StreamingMessage>) => 
        dispatch(chatActions.updateLastMessage(messageUpdate)),
      [dispatch]
    ),
    
    appendToLastMessage: useCallback(
      (text: string) => dispatch(chatActions.appendToLastMessage(text)),
      [dispatch]
    ),
    
    setIsLoading: useCallback(
      (isLoading: boolean) => dispatch(chatActions.setIsLoading(isLoading)),
      [dispatch]
    ),
    
    setError: useCallback(
      (error: string | null) => dispatch(chatActions.setError(error)),
      [dispatch]
    ),
    
    setSelectedModel: useCallback(
      (model: string) => dispatch(chatActions.setSelectedModel(model)),
      [dispatch]
    ),
    
    setUseStreaming: useCallback(
      (useStreaming: boolean) => dispatch(chatActions.setUseStreaming(useStreaming)),
      [dispatch]
    ),
    
    setSocketConnected: useCallback(
      (connected: boolean) => dispatch(chatActions.setSocketConnected(connected)),
      [dispatch]
    ),
    
    setConnectionStatus: useCallback(
      (status: string) => dispatch(chatActions.setConnectionStatus(status)),
      [dispatch]
    ),
    
    setSelectedFiles: useCallback(
      (files: FileItem[]) => dispatch(chatActions.setSelectedFiles(files)),
      [dispatch]
    ),
    
    addSelectedFiles: useCallback(
      (files: FileItem[]) => dispatch(chatActions.addSelectedFiles(files)),
      [dispatch]
    ),
    
    removeSelectedFile: useCallback(
      (id: string) => dispatch(chatActions.removeSelectedFile(id)),
      [dispatch]
    ),
    
    setShowFileUpload: useCallback(
      (show: boolean) => dispatch(chatActions.setShowFileUpload(show)),
      [dispatch]
    ),
    
    addFileToLastMessage: useCallback(
      (file: FileAttachment) => dispatch(chatActions.addFileToLastMessage(file)),
      [dispatch]
    ),
    
    toggleStreamingMode: useCallback(
      (currentState: boolean) => dispatch(chatActions.setUseStreaming(!currentState)),
      [dispatch]
    ),
    
    toggleFileUpload: useCallback(
      (currentState: boolean) => dispatch(chatActions.setShowFileUpload(!currentState)),
      [dispatch]
    )
  };
};
