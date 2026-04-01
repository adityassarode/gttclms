import React from "react";

export default function SearchBar({
  categories,
  category,
  query,
  onCategoryChange,
  onQueryChange,
  onSubmit,
}) {
  return (
    <form className="search-bar" onSubmit={onSubmit}>
      <select
        value={category}
        onChange={(event) => onCategoryChange(event.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <input
        type="search"
        placeholder="Find the book you like..."
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
}
