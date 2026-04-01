import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import SearchBar from "../components/SearchBar.jsx";
import BookCard from "../components/BookCard.jsx";
import Toast from "../components/Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [featured, setFeatured] = useState([]);
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [toast, setToast] = useState("");

  const categories = useMemo(() => {
    const list = new Set(books.map((book) => book.category));
    return Array.from(list);
  }, [books]);

  const loadBooks = async () => {
    const [featuredRes, booksRes] = await Promise.all([
      api.get("/api/books", { params: { featured: true } }),
      api.get("/api/books"),
    ]);
    setFeatured(featuredRes.data);
    setBooks(booksRes.data);
  };

  const loadFavorites = async () => {
    if (!user) {
      setFavorites([]);
      return;
    }
    const res = await api.get("/api/favorites/me");
    setFavorites(res.data);
  };

  useEffect(() => {
    loadBooks().catch(() => setToast("Unable to load books"));
  }, []);

  useEffect(() => {
    loadFavorites().catch(() => setFavorites([]));
  }, [user]);

  const runSearch = async (nextQuery = query, nextCategory = category) => {
    try {
      const res = await api.get("/api/books", {
        params: {
          q: nextQuery || undefined,
          category: nextCategory || undefined,
        },
      });
      setBooks(res.data);
    } catch {
      setToast("Search failed. Try again.");
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    runSearch();
  };

  const handleFavorite = async (book) => {
    if (!user) {
      navigate(`/login?redirect=/book/${book.id}`);
      return;
    }
    const isFavorite = favorites.some((fav) => fav.id === book.id);
    if (isFavorite) {
      await api.delete(`/api/favorites/${book.id}`);
      setFavorites((prev) => prev.filter((fav) => fav.id !== book.id));
      setToast("Removed from favorites");
      return;
    }
    await api.post(`/api/favorites/${book.id}`);
    setFavorites((prev) => [...prev, book]);
    setToast("Added to favorites");
  };

  return (
    <div className="dashboard">
      <div className="hero-card">
        <div>
          <h2>Discover</h2>
          <p>Find books that match your curiosity and goals.</p>
        </div>
        <SearchBar
          categories={categories}
          category={category}
          query={query}
          onCategoryChange={setCategory}
          onQueryChange={setQuery}
          onSubmit={handleSearch}
        />
      </div>

      <section className="section">
        <div className="section-header">
          <h3>Book Recommendation</h3>
          <button className="ghost" type="button" onClick={() => loadBooks()}>
            View all
          </button>
        </div>
        <div className="book-shelf">
          {featured.map((book) => (
            <button
              key={book.id}
              className="shelf-card"
              type="button"
              onClick={() => navigate(`/book/${book.id}`)}
            >
              <img
                src={book.coverUrl || "https://placehold.co/64x90?text=Book"}
                alt={book.title}
              />
              <div>
                <h4>{book.title}</h4>
                <p>{book.author}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h3>Book Category</h3>
        </div>
        <div className="category-row">
          {categories.map((item) => (
            <button
              key={item}
              className="category-card"
              type="button"
              onClick={() => {
                setCategory(item);
                setQuery("");
                runSearch("", item);
              }}
            >
              <span>{item}</span>
              <small>Explore curated reads</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h3>All Books</h3>
          <span className="muted">{books.length} results</span>
        </div>
        <div className="book-grid">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              isFavorite={favorites.some((fav) => fav.id === book.id)}
              onFavorite={() => handleFavorite(book)}
              onDetails={() => navigate(`/book/${book.id}`)}
            />
          ))}
        </div>
      </section>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
