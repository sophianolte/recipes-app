export default function CategoryFilter({ categories, selectedCategory, onChange }) {
  return (
    <select
      value={selectedCategory || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full px-4 py-2.5 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none transition-colors appearance-none cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235a6b5a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: '36px',
      }}
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
