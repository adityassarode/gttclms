import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import BookCard from "../components/BookCard.jsx";
import Toast from "../components/Toast.jsx";

export default function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [toast, setToast] = useState("");

  const loadFavorites = async () => {
    const res = await api.get("/api/favorites/me");
    setFavorites(res.data);
  };

  useEffect(() => {
    loadFavorites().catch(() => setToast("Unable to load favorites"));
  }, []);

  const removeFavorite = async (book) => {
    await api.delete(`/api/favorites/${book.id}`);
    setFavorites((prev) => prev.filter((fav) => fav.id !== book.id));
    setToast("Removed from favorites");
  };

  return (
    <div className="list-page">
      <div className="card">
        <h2>Your Favorites</h2>
        <p>Quick access to the books you love.</p>
      </div>
      <div className="book-grid">
        {favorites.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            isFavorite
            onFavorite={() => removeFavorite(book)}
            onDetails={() => navigate(`/book/${book.id}`)}
          />
        ))}
      </div>
      {favorites.length === 0 && <div className="empty">No favorites yet.</div>}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
