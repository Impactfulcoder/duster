import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user, updateProfile } = useAuth();
  const [theme, setTheme] = useState(
    localStorage.getItem('duster_theme') || user?.themePreference || 'terminal'
  );

  useEffect(() => {
    if (user?.themePreference) {
      setTheme(user.themePreference);
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('duster_theme', theme);
  }, [theme]);

  const changeTheme = (newTheme) => {
    if (['dark', 'light', 'terminal'].includes(newTheme)) {
      setTheme(newTheme);
      if (user) {
        updateProfile({ themePreference: newTheme }).catch(() => {});
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
