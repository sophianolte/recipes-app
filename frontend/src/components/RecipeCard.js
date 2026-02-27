import Link from 'next/link';

export default function RecipeCard({ recipe, onToggleFavorite, onDelete, onToggleVisibility, showVisibility, showOwner, isOwner }) {
  return (
    <div className="group bg-card rounded-xl border border-border-light overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200">
      {/* Image or placeholder */}
      <div className="h-40 bg-muted flex items-center justify-center relative overflow-hidden">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="w-full h-full flex items-center justify-center absolute inset-0"
          style={{ display: recipe.imageUrl ? 'none' : 'flex' }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
        </div>

        {/* Favorite button (only for global recipes) */}
        {onToggleFavorite && (
          <button
            onClick={() => onToggleFavorite(recipe.id)}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 ${
              recipe.isFavorite
                ? 'bg-primary text-primary-foreground hover:brightness-110'
                : 'bg-card/80 backdrop-blur-sm text-muted-foreground hover:bg-primary-light hover:text-primary'
            }`}
            title={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={recipe.isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        )}

        {/* Owner badge */}
        {showOwner && recipe.ownerName && (
          <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-foreground z-10">
            by {recipe.ownerName}
          </div>
        )}

        {/* Visibility badge for own recipes */}
        {showVisibility && (
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium z-10 ${
            recipe.isPublic
              ? 'bg-primary/90 text-primary-foreground'
              : 'bg-card/90 backdrop-blur-sm text-muted-foreground'
          }`}>
            {recipe.isPublic ? 'Public' : 'Private'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {recipe.categoryName && (
          <span className="inline-block bg-primary-light text-primary px-2.5 py-0.5 rounded-full text-xs font-medium mb-2">
            {recipe.categoryName}
          </span>
        )}

        <Link href={`/recipes/${recipe.id}`}>
          <h3 className="text-base font-semibold text-card-foreground group-hover:text-primary transition-colors mb-1.5 line-clamp-1">
            {recipe.title}
          </h3>
        </Link>

        {recipe.description && (
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2 leading-relaxed">
            {recipe.description}
          </p>
        )}

        <div className="flex gap-4 text-xs text-muted-foreground mb-3">
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              {recipe.servings} servings
            </span>
          )}
          {recipe.prepTime && (
            <span className="flex items-center gap-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {recipe.prepTime} min
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-3 border-t border-border-light">
          <div className="flex gap-1">
            {/* Visibility toggle for own recipes */}
            {isOwner && onToggleVisibility && (
              <button
                onClick={() => onToggleVisibility(recipe.id)}
                className={`p-1.5 rounded-md transition-colors ${
                  recipe.isPublic
                    ? 'text-primary hover:text-accent hover:bg-primary-light'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title={recipe.isPublic ? 'Set to Private' : 'Set to Public'}
              >
                {recipe.isPublic ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            )}

            {isOwner && (
              <>
                <Link
                  href={`/recipes/${recipe.id}/edit`}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Edit recipe"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </Link>
                {onDelete && (
                  <button
                    onClick={() => onDelete(recipe.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete recipe"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
          
          <Link
            href={`/recipes/${recipe.id}`}
            className="text-primary hover:text-accent text-sm font-medium flex items-center gap-1 transition-colors"
          >
            View
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
