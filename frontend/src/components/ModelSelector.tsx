import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

export interface AIModel {
  id: string;
  name: string;
  description: string;
  isMultimodal?: boolean;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Available AI models
  const models: AIModel[] = [
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      description: 'Advanced model with multimodal capabilities',
      isMultimodal: true
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      description: 'Fast, efficient model for text-only conversations',
      isMultimodal: false
    }
  ];

  // Find the currently selected model
  const currentModel = models.find(model => model.id === selectedModel) || models[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle model selection
  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="flex items-center">
          <span>{currentModel.name}</span>
        </span>
        <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1 text-gray-400" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {models.map((model) => (
              <button
                key={model.id}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  model.id === selectedModel
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                role="menuitem"
                onClick={() => handleModelSelect(model.id)}
              >
                <div className="font-medium">{model.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{model.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
