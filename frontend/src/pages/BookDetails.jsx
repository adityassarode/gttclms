import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client.js";
import Toast from "../components/Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    api
      .get(`/api/books/${id}`)
      .then((res) => setBook(res.data))
      .catch(() => setToast("Unable to load book"));
  }, [id]);

  const handleBorrow = async () => {
    if (!user) {
      navigate(`/login?redirect=/book/${id}`);
      return;
    }
    try {
      await api.post("/api/borrows", { bookId: book.id });
      setToast("Book borrowed. Return within 7 days.");
      setBook((prev) => ({
        ...prev,
        copiesAvailable: Math.max(0, prev.copiesAvailable - 1),
      }));
    } catch (error) {
      setToast(error?.response?.data?.message || "Unable to borrow");
    }
  };

  const handleReserve = async () => {
    if (!user) {
      navigate(`/login?redirect=/book/${id}`);
      return;
    }
    try {
      await api.post("/api/reservations", { bookId: book.id });
      setToast("Reserved. Collect within 2 hours.");
      setBook((prev) => ({
        ...prev,
        copiesAvailable: Math.max(0, prev.copiesAvailable - 1),
      }));
    } catch (error) {
      setToast(error?.response?.data?.message || "Unable to reserve");
    }
  };

  if (!book) {
    return <div className="card">Loading...</div>;
  }
  const cover = book.coverUrl || "https://placehold.co/320x480?text=Book";

  return (
    <div className="detail-page">
      <div className="detail-cover">
        <img src={cover} alt={book.title} />
      </div>
      <div className="detail-content">
        <span className="pill">{book.category}</span>
        <h2>{book.title}</h2>
        <p className="book-author">{book.author}</p>
        <p className="detail-desc">{book.description}</p>
        <div className="detail-meta">
          <div>
            <h4>Availability</h4>
            <p>{book.copiesAvailable > 0 ? "Available" : "Out of stock"}</p>
          </div>
          <div>
            <h4>Total Copies</h4>
            <p>{book.copiesTotal}</p>
          </div>
        </div>
        <div className="detail-actions">
          <button type="button" onClick={handleBorrow}>
            Borrow
          </button>
          <button type="button" className="ghost" onClick={handleReserve}>
            Reserve
          </button>
        </div>
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
