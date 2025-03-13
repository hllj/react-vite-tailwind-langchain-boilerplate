import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  darkMode: boolean;
}

// Initialize state from localStorage or system preference
const getInitialDarkMode = (): boolean => {
  const savedMode = localStorage.getItem('darkMode');
  return savedMode ? JSON.parse(savedMode) : 
    window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const initialState: UIState = {
  darkMode: getInitialDarkMode(),
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
  },
});

export const { toggleDarkMode, setDarkMode } = uiSlice.actions;
export default uiSlice.reducer;