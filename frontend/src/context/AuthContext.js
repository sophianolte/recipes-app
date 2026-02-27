'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const stored = localStorage.getItem('recipeUser');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('recipeUser');
      }
    }
    setLoading(false);
  }, []);

  function login(userData) {
    setUser(userData);
    localStorage.setItem('recipeUser', JSON.stringify(userData));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('recipeUser');
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
