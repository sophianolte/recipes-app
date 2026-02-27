'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { login as apiLogin } from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.');
      return;
    }

    try {
      setLoading(true);
      const userData = await apiLogin(username.trim(), password.trim());
      login(userData);
      router.push('/');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid username or password. Please try again.');
      } else {
        setError('Failed to connect to server. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 21h10" />
              <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" />
              <path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.13 1.33l-12.4 6.84Z" />
              <path d="M13 10.2 6.34 7.06c-.17.98.06 2 .63 2.84" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">My Recipes</h1>
          <p className="text-muted-foreground mt-1">Sign in to see your recipes</p>
        </div>

        {/* Login Form */}
        <div className="bg-card rounded-xl border border-border-light p-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none transition-colors"
                placeholder="e.g. pascal"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none transition-colors"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Hint */}
        <div className="mt-4 bg-primary-light rounded-xl p-4 text-sm">
          <p className="font-medium text-primary mb-2">Available users:</p>
          <div className="grid grid-cols-2 gap-1 text-muted-foreground">
            <span>pascal / pascal123</span>
            <span>alex / alex123</span>
            <span>twan / twan123</span>
            <span>sophia / sophia123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
