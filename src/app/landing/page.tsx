export const metadata = {
  title: "untavoloper.me — Gestionale prenotazioni per ristoranti",
  description:
    "Prenotazioni online, menu QR, WhatsApp automatico e telefonia integrata. Il gestionale che lavora per il tuo ristorante anche quando il telefono squilla.",
};

const features = [
  {
    icon: "📅",
    title: "Prenotazioni online",
    desc: "Widget embeddabile nel tuo sito. I clienti prenotano in 30 secondi, tu vedi tutto in tempo reale.",
  },
  {
    icon: "🏠",
    title: "Gestione sala visiva",
    desc: "Mappa interattiva della sala con tavoli, coperti e stato occupazione aggiornato in diretta.",
  },
  {
    icon: "📱",
    title: "WhatsApp automatico",
    desc: "Chi scrive su WhatsApp riceve subito il link di prenotazione con il numero già compilato.",
  },
  {
    icon: "📋",
    title: "Menu QR ai tavoli",
    desc: "I clienti scannerizzano il QR, sfogliano il menu e ordinano direttamente. La cucina vede tutto.",
  },
  {
    icon: "☎️",
    title: "Zero chiamate perse",
    desc: "Il sistema intercetta ogni chiamata e invia automaticamente il link WhatsApp al cliente.",
    pro: true,
  },
  {
    icon: "📊",
    title: "Log chiamate perse",
    desc: "Tabella completa di chi ha chiamato: numero, ora, esito del messaggio WhatsApp inviato.",
    pro: true,
  },
];

const steps = [
  {
    n: "01",
    title: "Analisi e setup",
    desc: "Configuriamo insieme orari, turni, sale, tavoli e menu. Ci pensiamo noi.",
  },
  {
    n: "02",
    title: "Go live in pochi giorni",
    desc: "Il widget va sul tuo sito, WhatsApp si aggancia, il numero telefonico è attivo.",
  },
  {
    n: "03",
    title: "Tu servi, noi gestiamo",
    desc: "Le prenotazioni arrivano, i tavoli si aggiornano, i clienti ricevono conferme automatiche.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* HEADER */}
      <header className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/untavoloperlogo.svg"
            alt="untavoloper.me"
            className="h-72 w-auto"
          />
          <nav className="flex items-center gap-2 text-sm font-medium">
            <a
              href="#features"
              className="px-4 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Funzionalità
            </a>
            <a
              href="#prezzi"
              className="px-4 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Prezzi
            </a>
            <a
              href="#contatti"
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Richiedi demo
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-foreground text-background py-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-4">
            Il gestionale per ristoranti
          </p>
          <h1 className="text-4xl md:text-6xl font-serif font-normal leading-tight mb-6">
            Prenota · Ordina · Gusta
          </h1>
          <p className="text-xl text-background/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Prenotazioni online, menu QR e WhatsApp automatico — tutto integrato.{" "}
            <strong className="text-background">Zero commissioni per coperto.</strong> Solo un canone fisso mensile.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#prezzi"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-medium hover:bg-primary/90 transition-colors shadow-lg"
            >
              Scopri i piani
            </a>
            <a
              href="#contatti"
              className="border border-background/30 text-background px-8 py-4 rounded-lg text-lg font-medium hover:bg-background/10 transition-colors"
            >
              Richiedi una demo
            </a>
          </div>

          {/* KPI strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { v: "€0", l: "commissioni per coperto" },
              { v: "24h", l: "disponibile tutto il giorno" },
              { v: "100%", l: "dati tuoi, nessun lock-in" },
              { v: "1 giorno", l: "per andare online" },
            ].map(({ v, l }) => (
              <div key={l} className="bg-background/5 border border-background/10 rounded-xl p-5">
                <p className="text-3xl font-serif text-primary mb-1">{v}</p>
                <p className="text-sm text-background/60">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 bg-muted/40">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-primary text-sm font-semibold tracking-widest uppercase text-center mb-3">
            Funzionalità
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground text-center mb-14">
            Tutto ciò che serve, niente di più
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className={`rounded-xl p-6 border bg-card ${
                  f.pro ? "border-primary/40 shadow-sm shadow-primary/10" : "border-border"
                }`}
              >
                {f.pro && (
                  <span className="text-xs font-bold tracking-widest text-primary uppercase mb-3 block">
                    Solo Piano Pro
                  </span>
                )}
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <p className="text-primary text-sm font-semibold tracking-widest uppercase text-center mb-3">
          Come funziona
        </p>
        <h2 className="text-3xl md:text-4xl font-serif text-foreground text-center mb-14">
          Operativo in pochi giorni
        </h2>
        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((s) => (
            <div key={s.n} className="text-center">
              <p className="text-6xl font-serif text-border mb-4">{s.n}</p>
              <h3 className="text-xl font-semibold text-foreground mb-3">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="prezzi" className="bg-muted/40 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-primary text-sm font-semibold tracking-widest uppercase text-center mb-3">
            Piani e prezzi
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground text-center mb-4">
            Canone mensile fisso
          </h2>
          <p className="text-center text-muted-foreground mb-14">
            Canone solo gestionale. Numero telefonico e messaggi WhatsApp sono servizi aggiuntivi separati.
          </p>

          <div className="grid md:grid-cols-2 gap-6">

            {/* BASE */}
            <div className="bg-card rounded-xl p-8 border border-border shadow-sm">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2">Piano</p>
              <h3 className="text-2xl font-serif text-foreground mb-1">Tavola Base</h3>
              <div className="flex items-end gap-1 my-4">
                <span className="text-5xl font-serif text-primary">€99</span>
                <span className="text-muted-foreground mb-2">/mese</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
                Avviamento una tantum: <strong className="text-foreground">€249</strong>
              </p>
              <ul className="space-y-3 text-sm text-foreground">
                {[
                  "Widget prenotazione embeddabile nel sito",
                  "Pannello admin completo (Admin + Staff + Cucina)",
                  "Gestione sala visiva con mappa tavoli",
                  "Menu QR ai tavoli + sistema ordini",
                  "Conferme e reminder automatici via WhatsApp",
                  "Auto-reply WhatsApp con link di prenotazione personalizzato",
                  "Integrazione WhatsApp completa (richiede add-on messaggi)",
                  "Aggiornamenti in tempo reale (sala/cucina)",
                  "Assistenza post-avviamento via email / WhatsApp",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-primary mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#contatti"
                className="mt-8 block text-center border border-primary text-primary px-6 py-3 rounded-lg font-medium hover:bg-primary/5 transition-colors"
              >
                Inizia con il Base
              </a>
            </div>

            {/* PRO */}
            <div className="bg-foreground rounded-xl p-8 border border-foreground shadow-xl relative">
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                Consigliato
              </div>
              <p className="text-xs font-bold tracking-widest text-background/50 uppercase mb-2">Piano</p>
              <h3 className="text-2xl font-serif text-background mb-1">Tavola Pro</h3>
              <div className="flex items-end gap-1 my-4">
                <span className="text-5xl font-serif text-primary">€159</span>
                <span className="text-background/50 mb-2">/mese</span>
              </div>
              <p className="text-sm text-background/50 mb-6 pb-6 border-b border-background/10">
                Avviamento una tantum: <strong className="text-background">€399</strong>
              </p>
              <ul className="space-y-3 text-sm">
                {[
                  { text: "Tutto il Piano Base incluso", base: true },
                  { text: "Integrazione telefonica Asterisk (richiede add-on numero SIP)" },
                  { text: "Intercettazione e log di tutte le chiamate in arrivo" },
                  { text: "Auto-WhatsApp istantaneo a chi chiama da cellulare" },
                  { text: "Dashboard chiamate perse con log completo" },
                  { text: "Configurazione trunk SIP guidata dal pannello" },
                  { text: "Assistenza telefonica + sessione remota (TeamViewer)" },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className={`mt-0.5 shrink-0 ${item.base ? "text-background/40" : "text-primary"}`}>
                      {item.base ? "→" : "✓"}
                    </span>
                    <span className={item.base ? "text-background/60 italic" : "text-background/90"}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
              <a
                href="#contatti"
                className="mt-8 block text-center bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Scegli il Pro
              </a>
            </div>
          </div>

          {/* ADD-ONS */}
          <div className="mt-6 bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/50">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Servizi aggiuntivi — obbligatori per utilizzare telefonia e WhatsApp
              </p>
            </div>
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="px-6 py-5 flex items-start gap-4">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-semibold text-foreground text-sm">Numero telefonico locale</p>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    Linea SIP dedicata (Messagenet). Necessario per il Piano Pro e per ricevere chiamate.
                  </p>
                  <p className="text-primary font-semibold mt-2">€25 + IVA / mese</p>
                </div>
              </div>
              <div className="px-6 py-5 flex items-start gap-4">
                <span className="text-2xl">💬</span>
                <div>
                  <p className="font-semibold text-foreground text-sm">10.000 messaggi WhatsApp / mese</p>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    Servizio SendApp Cloud. Sufficiente per ~150 prenotazioni/giorno inclusi reminder e auto-reply.
                  </p>
                  <p className="text-primary font-semibold mt-2">€25 + IVA / mese</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-border bg-muted/30 grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
              <p><strong className="text-foreground">Base + WA:</strong> €99 + €25 = <strong className="text-primary">€124/mese</strong> + IVA</p>
              <p><strong className="text-foreground">Pro + Tel + WA:</strong> €159 + €25 + €25 = <strong className="text-primary">€209/mese</strong> + IVA</p>
            </div>
          </div>

          {/* ROI */}
          <div className="mt-6 bg-card rounded-xl p-6 border border-border text-center">
            <p className="text-muted-foreground text-sm">
              <strong className="text-foreground">Il Piano Pro si ripaga da solo.</strong>{" "}
              Con uno scontrino medio di €35 a persona, bastano{" "}
              <strong className="text-primary">3 tavoli da 2 persone al mese</strong> per coprire
              l&apos;intera differenza annua rispetto al Base — ogni chiamata senza risposta automatica è un
              tavolo perso.
            </p>
          </div>
        </div>
      </section>

      {/* VS THEFORK */}
      <section className="py-20 max-w-4xl mx-auto px-6">
        <h2 className="text-3xl font-serif text-foreground text-center mb-12">
          Perché non TheFork o Plateform?
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 text-muted-foreground font-normal"></th>
                <th className="text-center py-3 px-4 font-semibold text-primary">untavoloper.me</th>
                <th className="text-center py-3 px-4 font-normal text-muted-foreground">TheFork / altri</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Commissioni per coperto", "€0 — mai", "€2–4 per coperto"],
                ["I dati dei clienti sono tuoi", "✓ Sempre", "✗ Rimangono loro"],
                ["WhatsApp automatico", "✓ Incluso", "✗ Non disponibile"],
                ["Telefonia integrata", "✓ Piano Pro", "✗ Non disponibile"],
                ["Menu QR + ordini tavolo", "✓ Incluso", "✗ / extra a pagamento"],
                ["Canone gestionale", "€99 – €159 + servizi", "€150 – €350+ con commissioni"],
              ].map(([feat, us, them]) => (
                <tr key={feat as string} className="border-b border-border last:border-0">
                  <td className="py-3 px-4 text-foreground">{feat}</td>
                  <td className="py-3 px-4 text-center font-medium text-foreground">{us}</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">{them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section id="contatti" className="bg-foreground py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-background mb-6">
            Pronto a portare il tuo ristorante online?
          </h2>
          <p className="text-background/60 mb-10 leading-relaxed">
            Scrivici su WhatsApp o per email. Ti ricontattiamo entro poche ore per capire le
            tue esigenze e prepararti un preventivo personalizzato.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:untavoloperme@gmail.com"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              ✉️ untavoloperme@gmail.com
            </a>
          </div>
          <p className="text-background/40 text-sm mt-8">
            Vuoi prima vedere il sistema in azione?{" "}
            <a href="/demo-site" className="text-primary hover:underline">
              Guarda la demo live →
            </a>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-6 border-t border-border max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/untavoloperlogo.svg" alt="untavoloper.me" className="h-8 opacity-50" />
        <p>© {new Date().getFullYear()} untavoloper.me — Tutti i diritti riservati</p>
        <a href="/offerta.html" className="hover:text-primary transition-colors">
          Scarica offerta PDF →
        </a>
      </footer>

    </div>
  );
}
