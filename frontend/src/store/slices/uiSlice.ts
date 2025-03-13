import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  darkMode: boolean;
  viewport: {
    width: number;
    height: number;
  };
}

// Initialize state from localStorage or system preference
const getInitialDarkMode = (): boolean => {
  const savedMode = localStorage.getItem('darkMode');
  return savedMode ? JSON.parse(savedMode) : 
    window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const initialState: UIState = {
  darkMode: getInitialDarkMode(),
  viewport: {
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  },
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      // Save to localStorage
      localStorage.setItem('darkMode', JSON.stringify(state.darkMode));
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
      // Save to localStorage
      localStorage.setItem('darkMode', JSON.stringify(state.darkMode));
    },
    // New action for viewport updates
    updateViewportDimensions: (state, action: PayloadAction<{width: number; height: number}>) => {
      state.viewport = action.payload;
    },
  },
});

export const { toggleDarkMode, setDarkMode, updateViewportDimensions } = uiSlice.actions;
export default uiSlice.reducer;