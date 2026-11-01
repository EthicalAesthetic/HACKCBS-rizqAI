export default function TrustLogos() {
  const partners = [
    { name: "Bloomberg", font: "font-serif tracking-tight font-extrabold text-base sm:text-lg" },
    { name: "REUTERS", font: "font-sans tracking-widest font-bold text-xs sm:text-sm" },
    { name: "yahoo! finance", font: "font-sans tracking-tight font-black text-sm sm:text-base italic" },
    { name: "CNBC", font: "font-sans font-black tracking-tight text-base sm:text-lg" },
    { name: "Investopedia", font: "font-sans font-bold tracking-tight text-sm sm:text-base" },
    { name: "FINANCIAL TIMES", font: "font-serif tracking-widest font-semibold text-xs sm:text-sm" },
    { name: "SEC EDGAR", font: "font-mono tracking-wider font-bold text-xs sm:text-sm uppercase" },
  ];

  return (
    <section className="relative border-y border-white/[0.08] bg-black py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono">
          Data Connectors & Verified Telemetry Sources
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-50 hover:opacity-90 transition-all duration-300">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className={`text-zinc-400 hover:text-white transition-colors cursor-default select-none ${partner.font}`}
            >
              {partner.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
