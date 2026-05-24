export default function SiteFooter({ dark = false }: { dark?: boolean }) {
  return (
    <footer
      className="w-full flex items-center justify-center py-2.5 px-4"
      style={dark ? { borderTop: "1px solid rgba(255,255,255,0.07)" } : { borderTop: "1px solid rgba(0,0,0,0.07)" }}
    >
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
