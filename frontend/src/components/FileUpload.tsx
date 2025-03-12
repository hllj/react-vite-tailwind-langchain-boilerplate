import { useState, useRef } from 'react';
import { PaperClipIcon, XMarkIcon, DocumentIcon, PhotoIcon } from '@heroicons/react/24/solid';

export interface FileItem {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'document' | 'other';
}

interface FileUploadProps {
  onFileSelect: (files: FileItem[]) => void;
  selectedFiles: FileItem[];
  onFileRemove: (id: string) => void;
  maxFiles?: number;
  acceptedTypes?: string;
}

export default function FileUpload({ 
  onFileSelect, 
  selectedFiles, 
  onFileRemove, 
  maxFiles = 5,
  acceptedTypes = "image/*,.pdf,.doc,.docx,.txt"
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFiles(event.target.files);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (event.dataTransfer.files) {
      processFiles(event.dataTransfer.files);
    }
  };

  const processFiles = (fileList: FileList) => {
    const newFiles: FileItem[] = [];
    
    // Limit number of files that can be added
    const remainingSlots = maxFiles - selectedFiles.length;
    const filesToProcess = Math.min(fileList.length, remainingSlots);
    
    if (filesToProcess <= 0) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }
    
    for (let i = 0; i < filesToProcess; i++) {
      const file = fileList[i];
      const fileId = `file_${Date.now()}_${i}`;
      
      // Determine file type
      let fileType: 'image' | 'document' | 'other' = 'other';
      let preview: string | undefined = undefined;
      
      if (file.type.startsWith('image/')) {
        fileType = 'image';
        preview = URL.createObjectURL(file);
      } else if (file.type === 'application/pdf' || 
                file.type === 'application/msword' || 
                file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                file.type === 'text/plain') {
        fileType = 'document';
      }
      
      newFiles.push({
        id: fileId,
        file,
        preview,
        type: fileType
      });
    }
    
    onFileSelect(newFiles);
  };
  
  const getFileIcon = (fileType: 'image' | 'document' | 'other') => {
    switch (fileType) {
      case 'image':
        return <PhotoIcon className="h-5 w-5" />;
      case 'document':
        return <DocumentIcon className="h-5 w-5" />;
      default:
        return <PaperClipIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="w-full">
      <div 
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <PaperClipIcon className="h-6 w-6 mx-auto text-gray-400 dark:text-gray-300" />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Drag & drop files or click to select
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {`Supported formats: Images, PDF, Word, Text (Max: ${maxFiles} files)`}
        </p>
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden"
        onChange={handleFileSelect}
        accept={acceptedTypes}
        multiple
      />
      
      {selectedFiles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedFiles.map(fileItem => (
            <div 
              key={fileItem.id} 
              className="relative flex items-center rounded-md bg-gray-100 dark:bg-gray-800 pr-2 pl-2 py-1 group"
            >
              {fileItem.preview ? (
                <img 
                  src={fileItem.preview} 
                  alt="Preview" 
                  className="h-6 w-6 object-cover rounded mr-1" 
                />
              ) : (
                <span className="mr-1 text-gray-500 dark:text-gray-400">
                  {getFileIcon(fileItem.type)}
                </span>
              )}
              <span className="text-xs text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                {fileItem.file.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemove(fileItem.id);
                  if (fileItem.preview) {
                    URL.revokeObjectURL(fileItem.preview);
                  }
                }}
                className="ml-1 p-0.5 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
