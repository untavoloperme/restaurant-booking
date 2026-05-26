"use client";

import { useEffect } from "react";

export default function DemoSitePage() {
  // Inject the booking widget
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/widget-loader.js";
    script.setAttribute("data-url", window.location.origin);
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
      document.getElementById("rb-bubble")?.remove();
      document.getElementById("rb-container")?.remove();
    };
  }, []);

  function openWidget() {
    (document.getElementById("rb-bubble") as HTMLElement | null)?.click();
  }

  function handleBook() {
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = "/prenota";
    } else {
      openWidget();
    }
  }

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: "#fdf8f0", color: "#2d1f0e", minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(253,248,240,0.96)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #e8d5b0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "64px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.6rem" }}>🍽️</span>
          <span style={{ fontWeight: "bold", fontSize: "1.1rem", letterSpacing: "0.03em", color: "#7c2d12" }}>
            Osteria delle Stelle
          </span>
        </div>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.9rem", color: "#5c3d1e" }}>
          <a href="#menu" style={{ textDecoration: "none", color: "inherit" }}>Menù</a>
          <a href="#about" style={{ textDecoration: "none", color: "inherit" }}>Chi siamo</a>
          <a href="#orari" style={{ textDecoration: "none", color: "inherit" }}>Orari</a>
          <button onClick={handleBook} style={{
            background: "#7c2d12", color: "white", border: "none", borderRadius: "6px",
            padding: "7px 18px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit",
          }}>
            Prenota
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: "92vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #7c2d12 0%, #9a3412 30%, #78350f 70%, #431407 100%)",
        position: "relative", overflow: "hidden", textAlign: "center", padding: "4rem 2rem",
      }}>
        {/* decorative circles */}
        <div style={{ position: "absolute", top: "-80px", left: "-80px", width: "400px", height: "400px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", bottom: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        <div style={{ position: "relative", maxWidth: "680px" }}>
          <p style={{ color: "#fcd34d", fontSize: "0.85rem", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "1rem" }}>
            Firenze — dal 1987
          </p>
          <h1 style={{ color: "white", fontSize: "clamp(2.4rem, 6vw, 4rem)", fontWeight: "normal", lineHeight: 1.15, margin: "0 0 1.2rem" }}>
            Osteria<br />delle Stelle
          </h1>
          <p style={{ color: "#fde68a", fontSize: "1.15rem", lineHeight: 1.6, marginBottom: "2.5rem", fontStyle: "italic" }}>
            Cucina toscana autentica, fatta con passione e ingredienti del territorio.
            Una serata da noi è un viaggio tra i sapori di una volta.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleBook} style={{
              background: "#fcd34d", color: "#7c2d12", border: "none", borderRadius: "8px",
              padding: "14px 32px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer",
              fontFamily: "inherit", letterSpacing: "0.02em",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}>
              Prenota un tavolo →
            </button>
            <a href="#menu" style={{
              border: "2px solid rgba(255,255,255,0.4)", color: "white", borderRadius: "8px",
              padding: "14px 32px", fontSize: "1rem", cursor: "pointer",
              fontFamily: "inherit", textDecoration: "none", display: "inline-block",
            }}>
              Scopri il menù
            </a>
          </div>
        </div>
      </section>

      {/* MENU */}
      <section id="menu" style={{ padding: "5rem 2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <p style={{ textAlign: "center", color: "#9a3412", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
          I nostri piatti
        </p>
        <h2 style={{ textAlign: "center", fontSize: "2.2rem", fontWeight: "normal", marginBottom: "3rem", color: "#431407" }}>
          Le specialità della casa
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          {[
            {
              emoji: "🥩",
              name: "Bistecca alla Fiorentina",
              desc: "Chianina IGP, almeno 600g, cotta alla brace con rosmarino fresco e olio del Chianti. La nostra bandiera dal 1987.",
              price: "€ 38",
              tag: "Secondi",
            },
            {
              emoji: "🍝",
              name: "Pici al Cinghiale",
              desc: "Pasta fresca tirata a mano con ragù di cinghiale della Maremma, cipolla rossa di Tropea e vino Morellino.",
              price: "€ 16",
              tag: "Primi",
            },
            {
              emoji: "🍮",
              name: "Panna Cotta al Vin Santo",
              desc: "Dessert della tradizione senese con riduzione di Vin Santo D.O.C. e cantuccini sbriciolati.",
              price: "€ 8",
              tag: "Dolci",
            },
          ].map((dish) => (
            <div key={dish.name} style={{
              background: "white", borderRadius: "12px", overflow: "hidden",
              boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1px solid #f0e4cc",
            }}>
              <div style={{
                background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                height: "140px", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "3.5rem",
              }}>
                {dish.emoji}
              </div>
              <div style={{ padding: "1.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.7rem", color: "#9a3412", textTransform: "uppercase", letterSpacing: "0.12em", background: "#fff1e6", padding: "2px 8px", borderRadius: "999px" }}>{dish.tag}</span>
                  <span style={{ fontWeight: "bold", color: "#7c2d12", fontSize: "1.05rem" }}>{dish.price}</span>
                </div>
                <h3 style={{ fontSize: "1.1rem", margin: "0.5rem 0", color: "#431407" }}>{dish.name}</h3>
                <p style={{ fontSize: "0.88rem", color: "#6b4c2a", lineHeight: 1.6, margin: 0 }}>{dish.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
          <p style={{ color: "#78350f", fontSize: "0.9rem" }}>
            Menù completo disponibile in sala · Carta vini con oltre 80 etichette toscane
          </p>
        </div>
      </section>

      {/* DIVIDER */}
      <div style={{ background: "linear-gradient(90deg, #7c2d12, #9a3412, #7c2d12)", height: "3px" }} />

      {/* CHI SIAMO */}
      <section id="about" style={{ background: "#2d1f0e", color: "#fde68a", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ letterSpacing: "0.18em", textTransform: "uppercase", fontSize: "0.8rem", color: "#f97316", marginBottom: "0.5rem" }}>La nostra storia</p>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "normal", marginBottom: "2rem", color: "white" }}>Chi siamo</h2>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "#e0c8a0", marginBottom: "1.5rem" }}>
            L&apos;Osteria delle Stelle nasce nel 1987 dalla famiglia Marchetti, nel cuore di Firenze.
            Da tre generazioni portiamo in tavola la cucina della nonna: ragù lenti, paste tirate a mano,
            carni certificate e vini delle colline senesi.
          </p>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.8, color: "#e0c8a0" }}>
            Il nostro obiettivo è semplice: che ogni ospite si senta a casa.
            Sala capiente ma accogliente, servizio attento e quella luce morbida
            che fa sembrare tutto più buono.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "3rem", marginTop: "3rem", flexWrap: "wrap" }}>
            {[["37", "anni di storia"], ["4.8★", "su Google"], ["120", "coperti"], ["80+", "etichette vino"]].map(([num, label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#fcd34d" }}>{num}</div>
                <div style={{ fontSize: "0.82rem", color: "#b08040", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ORARI */}
      <section id="orari" style={{ padding: "5rem 2rem", maxWidth: "900px", margin: "0 auto" }}>
        <p style={{ textAlign: "center", color: "#9a3412", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
          Quando trovarci
        </p>
        <h2 style={{ textAlign: "center", fontSize: "2.2rem", fontWeight: "normal", marginBottom: "3rem", color: "#431407" }}>
          Orari e dove siamo
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
          {/* Hours */}
          <div style={{ background: "white", borderRadius: "12px", padding: "2rem", border: "1px solid #f0e4cc", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 style={{ color: "#7c2d12", marginTop: 0, marginBottom: "1.2rem", fontSize: "1.1rem" }}>🕐 Orari di apertura</h3>
            {[
              ["Lunedì", "Chiuso"],
              ["Martedì – Venerdì", "12:00 – 14:30 · 19:00 – 22:30"],
              ["Sabato", "12:00 – 14:30 · 19:00 – 23:00"],
              ["Domenica", "12:00 – 15:00 · 19:30 – 22:00"],
            ].map(([day, hours]) => (
              <div key={day} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f5ece0", fontSize: "0.9rem" }}>
                <span style={{ color: "#5c3d1e", fontStyle: day === "Lunedì" ? "italic" : "normal" }}>{day}</span>
                <span style={{ color: day === "Lunedì" ? "#94a3b8" : "#431407", fontWeight: day === "Lunedì" ? "normal" : "500" }}>{hours}</span>
              </div>
            ))}
          </div>

          {/* Address + CTA */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ background: "white", borderRadius: "12px", padding: "2rem", border: "1px solid #f0e4cc", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", flex: 1 }}>
              <h3 style={{ color: "#7c2d12", marginTop: 0, marginBottom: "1rem", fontSize: "1.1rem" }}>📍 Dove siamo</h3>
              <p style={{ margin: "0 0 0.5rem", color: "#5c3d1e", lineHeight: 1.6, fontSize: "0.95rem" }}>
                Via dei Servi, 14<br />50122 Firenze FI
              </p>
              <p style={{ margin: "0", color: "#5c3d1e", fontSize: "0.95rem" }}>
                📞 055 123 4567<br />
                ✉️ info@osteriadellestelle.it
              </p>
            </div>
            <button onClick={handleBook} style={{
              background: "#7c2d12", color: "white", border: "none", borderRadius: "12px",
              padding: "18px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer",
              fontFamily: "inherit", boxShadow: "0 4px 16px rgba(124,45,18,0.3)",
            }}>
              🗓 Prenota il tuo tavolo
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: "#1a0f07", color: "#6b4c2a", padding: "2.5rem 2rem",
        textAlign: "center", fontSize: "0.85rem", borderTop: "3px solid #7c2d12",
      }}>
        <p style={{ margin: "0 0 0.5rem", color: "#e0c8a0", fontWeight: "bold", fontSize: "1rem" }}>
          🍽️ Osteria delle Stelle
        </p>
        <p style={{ margin: "0 0 1rem" }}>
          Via dei Servi 14, Firenze · 055 123 4567 · info@osteriadellestelle.it
        </p>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#4a3420" }}>
          © 2024 Osteria delle Stelle · Tutti i diritti riservati
        </p>
        <p style={{ margin: "0.8rem 0 0", fontSize: "0.7rem", color: "#3d2812" }}>
          Sistema prenotazioni powered by{" "}
          <span style={{ color: "#9a3412" }}>Un Tavolo Per</span>
        </p>
      </footer>

    </div>
  );
}
