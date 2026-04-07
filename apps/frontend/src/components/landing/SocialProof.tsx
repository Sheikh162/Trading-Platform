export default function SocialProof() {
  const trustLogos = [
    "Binance", "Coinbase", "Backpack", "WazirX", "Kraken"
  ];

  return (
    <div className="w-full border-t border-border py-12 bg-muted/10">
      <div className="mx-auto max-w-7xl px-4 flex flex-col items-center gap-8">
        <p className="text-2xl font-semibold tracking-tight animate-text-color-breathe">Inspired From</p>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 items-center">
          {trustLogos.map((logo, i) => (
            <span
              key={logo}
              className="text-xl md:text-2xl font-medium tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-muted-foreground via-white to-muted-foreground bg-size-[200%_auto] animate-silver-foil opacity-80 hover:opacity-100 transition-opacity duration-300 cursor-default"
              style={{ animationDelay: `${i * 0.5}s` }}
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
