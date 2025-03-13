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
  darkMode?: boolean; // Add darkMode prop
}

export default function ModelSelector({ selectedModel, onModelChange, darkMode = false }: ModelSelectorProps) {
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

  // Get background color for dropdown items based on selection and dark mode
  const getItemBgColor = (isSelected: boolean) => {
    if (isSelected) {
      return darkMode ? 'bg-blue-900/30' : 'bg-blue-50';
    }
    // Add blue background for unselected items in dark mode too
    return darkMode ? 'bg-blue-900/10 hover:bg-gray-800' : 'hover:bg-gray-50';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium 
                  ${darkMode ? 'bg-gray-800 text-gray-200 border-gray-600' : 'bg-white text-gray-700 border-gray-300'} 
                  border rounded-md shadow-sm 
                  ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}
                  focus:outline-none focus:ring-2 focus:ring-blue-500 
                  transition-colors duration-200`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="flex items-center truncate">
          <span className={darkMode ? 'text-white' : 'text-gray-900'}>{currentModel.name}</span>
        </span>
        <ChevronDownIcon className={`w-5 h-5 ml-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className={`absolute z-10 w-full mt-1 shadow-lg rounded-md 
                      ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} 
                      border focus:outline-none overflow-hidden`}>
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {models.map((model) => {
              const isSelected = model.id === selectedModel;
              return (
                <button
                  key={model.id}
                  className={`block w-full text-left px-4 py-2 text-sm 
                          transition-colors duration-150 
                          ${getItemBgColor(isSelected)}
                          ${isSelected 
                            ? (darkMode ? ' text-blue-300' : ' text-blue-700')
                            : (darkMode ? ' text-gray-300' : ' text-gray-700')
                          }`}
                  role="menuitem"
                  onClick={() => handleModelSelect(model.id)}
                >
                  <div className={`font-medium ${
                    isSelected 
                      ? darkMode ? 'text-blue-300' : 'text-blue-800' 
                      : darkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    {model.name}
                  </div>
                  <div className={`text-xs ${
                    isSelected 
                      ? darkMode ? 'text-blue-400' : 'text-blue-700' 
                      : darkMode ? 'text-gray-400' : 'text-gray-500'
                  } mt-0.5`}>
                    {model.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
