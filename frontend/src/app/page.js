'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getRecipes, getMyRecipes, getOthersPublicRecipes, toggleFavorite } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import RecipeCard from '@/components/RecipeCard';
import SearchBar from '@/components/SearchBar';

export default function HomePage() {
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [activeSearch, setActiveSearch] = useState('');
  const [searching, setSearching] = useState(false);

  async function handleSearch(term) {
    if (!term.trim()) {
      setResults(null);
      setActiveSearch('');
      return;
    }
    setActiveSearch(term);
    setSearching(true);
    try {
      const [common, my, others] = await Promise.all([
        getRecipes(),
        getMyRecipes(),
        getOthersPublicRecipes(),
      ]);
      const match = (r) => r.title.toLowerCase().includes(term.toLowerCase());
      setResults({
        common: common.filter(match),
        my: my.filter(match),
        community: others.filter(match),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }

  async function handleToggleFavorite(id) {
    try {
      const result = await toggleFavorite(id);
      if (!results) return;
      const update = (list) => list.map((r) => r.id === id ? { ...r, isFavorite: result.isFavorite } : r);
      setResults({ common: update(results.common), my: update(results.my), community: update(results.community) });
    } catch (err) {
      console.error(err);
    }
  }

  const totalResults = results ? results.common.length + results.my.length + results.community.length : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center py-10 mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Hello, {user?.displayName}!
        </h1>
        <p className="text-muted-foreground text-lg mb-8">
          Welcome to your recipe collection
        </p>

        {/* Quick Nav Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <Link href="/common" className="group bg-card border border-border-light rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all text-left">
            <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">Common Recipes</h3>
            <p className="text-sm text-muted-foreground">Recipes available for everyone</p>
          </Link>

          <Link href="/my-recipes" className="group bg-card border border-border-light rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all text-left">
            <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">My Recipes</h3>
            <p className="text-sm text-muted-foreground">Your personal recipe collection</p>
          </Link>

          <Link href="/community" className="group bg-card border border-border-light rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all text-left">
            <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">Community Recipes</h3>
            <p className="text-sm text-muted-foreground">Recipes shared by other users</p>
          </Link>
        </div>

        {/* Global Search */}
        <div className="max-w-xl mx-auto">
          <p className="text-sm text-muted-foreground mb-3">Search across all recipe sections</p>
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>

      {/* Search Results */}
      {searching && (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground">Searching...</span>
          </div>
        </div>
      )}

      {results && !searching && (
        <div>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-light">
            <span className="text-foreground font-medium">
              {totalResults === 0
                ? `No results for "${activeSearch}"`
                : `${totalResults} result${totalResults !== 1 ? 's' : ''} for "${activeSearch}"`}
            </span>
          </div>

          {totalResults === 0 ? (
            <p className="text-center text-muted-foreground py-8">Try a different search term.</p>
          ) : (
            <div className="space-y-10">
              {results.common.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-bold text-foreground">Common Recipes</h2>
                    <span className="bg-primary-light text-primary text-xs font-medium px-2 py-0.5 rounded-full">{results.common.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {results.common.map((r) => (
                      <RecipeCard key={r.id} recipe={r} onToggleFavorite={handleToggleFavorite} />
                    ))}
                  </div>
                </section>
              )}

              {results.my.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-bold text-foreground">My Recipes</h2>
                    <span className="bg-primary-light text-primary text-xs font-medium px-2 py-0.5 rounded-full">{results.my.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {results.my.map((r) => (
                      <RecipeCard key={r.id} recipe={r} onToggleFavorite={handleToggleFavorite} isOwner showVisibility />
                    ))}
                  </div>
                </section>
              )}

              {results.community.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-bold text-foreground">Community Recipes</h2>
                    <span className="bg-primary-light text-primary text-xs font-medium px-2 py-0.5 rounded-full">{results.community.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {results.community.map((r) => (
                      <RecipeCard key={r.id} recipe={r} onToggleFavorite={handleToggleFavorite} showOwner />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
