import Link from 'next/link';

export default function RecipeCard({ recipe, onToggleFavorite, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Image placeholder */}
      <div className="h-40 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
        <span className="text-6xl">🍽️</span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category Badge */}
        {recipe.categoryName && (
          <span className="inline-block bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs mb-2">
            {recipe.categoryName}
          </span>
        )}

        {/* Title */}
        <Link href={`/recipes/${recipe.id}`}>
          <h3 className="text-lg font-semibold text-gray-800 hover:text-orange-600 transition-colors mb-2">
            {recipe.title}
          </h3>
        </Link>

        {/* Description */}
        {recipe.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {recipe.description}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex gap-4 text-sm text-gray-500 mb-3">
          {recipe.servings && (
            <span>👥 {recipe.servings}</span>
          )}
          {recipe.prepTime && (
            <span>⏱️ {recipe.prepTime} min</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-3 border-t">
          <div className="flex gap-2">
            <button
              onClick={() => onToggleFavorite(recipe.id)}
              className={`p-2 rounded transition-colors ${
                recipe.isFavorite
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-gray-400 hover:text-yellow-500'
              }`}
              title={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {recipe.isFavorite ? '★' : '☆'}
            </button>
            <Link
              href={`/recipes/${recipe.id}/edit`}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit recipe"
            >
              ✏️
            </Link>
            <button
              onClick={() => onDelete(recipe.id)}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete recipe"
            >
              🗑️
            </button>
          </div>
          
          <Link
            href={`/recipes/${recipe.id}`}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
          >
            View →
          </Link>
        </div>
      </div>
    </div>
  );
}