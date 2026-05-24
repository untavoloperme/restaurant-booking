export default function SiteFooter({ dark = false }: { dark?: boolean }) {
  return (
    <footer
      className="w-full flex flex-col items-center justify-center gap-1.5 py-3 px-4"
      style={dark ? { borderTop: "1px solid rgba(255,255,255,0.07)" } : { borderTop: "1px solid rgba(0,0,0,0.07)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/untavoloperlogo.svg"
        alt="Un Tavolo Per"
        className="h-24 w-auto object-contain"
        style={dark ? { filter: "brightness(0) invert(1)", opacity: 0.5 } : { opacity: 0.4 }}
      />
      <p className={`text-xs ${dark ? "text-white/40" : "text-slate-400"}`}>
        Powered by{" "}
        <a
          href="mailto:info@tekdata.it"
          className={`hover:underline ${dark ? "text-white/60" : "text-slate-500"}`}
        >
          Tekdata
        </a>
        {" "}—{" "}
        <a
          href="mailto:info@tekdata.it"
          className={`hover:underline ${dark ? "text-white/60" : "text-slate-500"}`}
        >
          info@tekdata.it
        </a>
      </p>
    </footer>
  );
}
