import React from "react";

export default function BookCard({ book, onDetails, onFavorite, isFavorite }) {
  const available = book.copiesAvailable > 0;
  const cover = book.coverUrl || "https://placehold.co/120x170?text=Book";

  return (
    <div className="book-card fade-in">
      <div className="book-cover">
        <img src={cover} alt={book.title} loading="lazy" />
      </div>
      <div className="book-body">
        <div>
          <h3>{book.title}</h3>
          <p className="book-author">{book.author}</p>
          <p className="book-desc">{book.description}</p>
        </div>
        <div className="book-actions">
          <span className={`status ${available ? "available" : "unavailable"}`}>
            {available ? "Available" : "Out of stock"}
          </span>
          <div className="book-buttons">
            <button type="button" className="ghost" onClick={onFavorite}>
              {isFavorite ? "Saved" : "Favorite"}
            </button>
            <button type="button" onClick={onDetails}>
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
