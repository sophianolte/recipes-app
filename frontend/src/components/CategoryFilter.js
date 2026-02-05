export default function CategoryFilter({ categories, selectedCategory, onChange }) {
  return (
    <select
      value={selectedCategory || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
    >
      <option value="">All Categories</option>
      {categories.map(category => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}