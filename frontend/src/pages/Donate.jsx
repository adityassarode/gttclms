import React, { useState } from "react";
import api from "../api/client.js";
import Toast from "../components/Toast.jsx";

export default function Donate() {
  const [form, setForm] = useState({
    title: "",
    author: "",
    description: "",
    copies: 1,
  });
  const [files, setFiles] = useState([]);
  const [toast, setToast] = useState("");

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 2) {
      setToast("Upload up to 2 images");
      return;
    }
    const tooLarge = selected.find((file) => file.size > 2 * 1024 * 1024);
    if (tooLarge) {
      setToast("Each image must be under 2MB");
      return;
    }
    setFiles(selected);
  };

  const submit = async (event) => {
    event.preventDefault();
    const payload = new FormData();
    payload.append("title", form.title);
    payload.append("author", form.author);
    payload.append("description", form.description);
    payload.append("copies", String(form.copies));
    if (files[0]) {
      payload.append("image1", files[0]);
    }
    if (files[1]) {
      payload.append("image2", files[1]);
    }
    try {
      await api.post("/api/donations", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setToast("Thank you for your donation!");
      setForm({ title: "", author: "", description: "", copies: 1 });
      setFiles([]);
    } catch (error) {
      setToast(error?.response?.data?.message || "Donation failed");
    }
  };

  return (
    <div className="form-page">
      <div className="card">
        <h2>Donate Books</h2>
        <p>Share knowledge with fellow students. Upload up to two images.</p>
      </div>
      <form className="form-card" onSubmit={submit}>
        <label>
          Title
          <input
            type="text"
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            required
          />
        </label>
        <label>
          Author
          <input
            type="text"
            value={form.author}
            onChange={(event) =>
              setForm({ ...form, author: event.target.value })
            }
            required
          />
        </label>
        <label>
          Description
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            rows={4}
          />
        </label>
        <label>
          Available copies
          <input
            type="number"
            min={1}
            value={form.copies}
            onChange={(event) =>
              setForm({ ...form, copies: event.target.value })
            }
            required
          />
        </label>
        <label>
          Upload images
          <input type="file" accept="image/*" multiple onChange={handleFiles} />
        </label>
        <div className="file-list">
          {files.map((file) => (
            <span key={file.name}>{file.name}</span>
          ))}
        </div>
        <button type="submit">Submit Donation</button>
      </form>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
