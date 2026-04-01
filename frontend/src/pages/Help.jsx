import React from "react";

const faqs = [
  {
    q: "How many books can I borrow at once?",
    a: "Each user can borrow up to 2 books and reserve 1 book at a time.",
  },
  {
    q: "What happens if I return a book late?",
    a: "A late fee of Rs 10 per extra day will be applied.",
  },
  {
    q: "How long does a reservation last?",
    a: "Reservations stay active for 2 hours.",
  },
];

export default function Help() {
  return (
    <div className="card">
      <h2>Help Center</h2>
      <p>Find quick answers or contact the GTTC Library team.</p>
      <div className="faq-list">
        {faqs.map((item) => (
          <div key={item.q} className="faq-item">
            <h4>{item.q}</h4>
            <p className="muted">{item.a}</p>
          </div>
        ))}
      </div>
      <a className="button-link" href="mailto:library@gttc.local">
        Contact support
      </a>
    </div>
  );
}
