import { useEffect } from 'react'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import './App.css'
import Chat from './components/Chat';
import { useAppDispatch, useAppSelector } from './hooks/useAppSelector';
import { toggleDarkMode } from './store/slices/uiSlice';

function App() {
  const { darkMode } = useAppSelector(state => state.ui);
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Update class on document when darkMode changes
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    dispatch(toggleDarkMode());
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10 flex-shrink-0">
        <div className="max-w-7xl mx-auto py-4 px-4 flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            AI Chat Assistant
          </h1>
          <button 
            onClick={handleToggleDarkMode}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <SunIcon className="h-5 w-5 text-yellow-400" />
            ) : (
              <MoonIcon className="h-5 w-5 text-gray-700" />
            )}
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <div className="h-full container mx-auto px-4 py-2">
          <Chat />
        </div>
      </main>
    </div>
  );
}

export default App;
