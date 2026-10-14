// Pure filtering/sorting so it can be reasoned about (and tested) apart from the DOM.

export function matches(item, f) {
  if (f.category && !item.category.includes(f.category)) return false;
  if (f.price && item.price !== f.price) return false;
  if (f.clap && !(item.formats || []).includes('CLAP')) return false;
  if (f.obscure && item.uniqueness < 4) return false;
  if (f.query) {
    const q = f.query.toLowerCase();
    const hay = [item.name, item.developer, item.description, ...(item.tags || [])]
      .join(' ')
      .toLowerCase();
    if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
  }
  return true;
}

export function sortItems(items, sort) {
  const copy = [...items];
  if (sort === 'name') copy.sort((a, b) => a.name.localeCompare(b.name));
  else copy.sort((a, b) => b.uniqueness - a.uniqueness || a.name.localeCompare(b.name));
  return copy;
}

export function applyFilters(items, f) {
  return sortItems(items.filter((item) => matches(item, f)), f.sort);
}
