import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "FitSize AI — Never Guess Your Size Again" },
      {
        name: "description",
        content:
          "Know your size in any brand instantly. Your own personal AI shopper.",
      },
    ],
  }),
});

function downloadExtension() {
  fetch("/fitsize-extension.zip")
    .then((res) => {
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "fitsize-extension.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch((err) => alert(err.message));
}

const serif = { fontFamily: '"GT Sectra", "Times New Roman", Georgia, serif' } as const;
const serifItalic = { ...serif, fontStyle: "italic" } as const;

function Landing() {
  return (
    <div
      className="min-h-screen overflow-x-hidden text-[#0a1530] antialiased"
      style={{
        background:
          "linear-gradient(180deg, #ffffff 0%, #ffffff 12%, #eef2fb 32%, #dbe5f7 50%, #eef2fb 68%, #ffffff 88%, #ffffff 100%)",
      }}
    >
      <Header />
      <Hero />
      <HowItWorks />
      <Brands />
      <Personal />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function TapeMeasure({
  accent = "#1e40af",
  className = "pointer-events-none absolute left-1/2 top-1/2 -z-10 h-32 w-screen -translate-x-1/2 -translate-y-[55%] opacity-90 sm:h-44",
  variant = "wave",
}: {
  accent?: string;
  className?: string;
  variant?: "wave" | "soft" | "loop";
}) {
  const uid = `${accent.replace("#", "")}-${variant}`;
  const tickId = `tape-ticks-${uid}`;
  const curveId = `tape-curve-${uid}`;
  const d =
    variant === "soft"
      ? "M 20 80 C 200 30, 380 110, 560 60 S 760 40, 780 70"
      : variant === "loop"
        ? "M 20 90 C 180 20, 340 130, 500 60 S 700 20, 780 80"
        : "M 20 100 C 160 10, 320 10, 400 70 S 640 130, 780 40";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 800 140"
      preserveAspectRatio="none"
      className={className}
    >
      <defs>
        <pattern id={tickId} width="14" height="20" patternUnits="userSpaceOnUse">
          <line x1="0" y1="4" x2="0" y2="10" stroke={accent} strokeWidth="1" />
          <line x1="7" y1="4" x2="7" y2="7" stroke={accent} strokeWidth="1" opacity="0.6" />
        </pattern>
        <path id={curveId} d={d} fill="none" />
      </defs>
      <use href={`#${curveId}`} stroke={accent} strokeOpacity="0.22" strokeWidth="14" strokeLinecap="round" />
      <use href={`#${curveId}`} stroke={`url(#${tickId})`} strokeWidth="14" strokeLinecap="round" />
      <use href={`#${curveId}`} stroke={accent} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />

    </svg>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#0a1530]/10 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo size="md" variant="dark" />
        <nav className="hidden items-center gap-8 text-[19px] text-[#0a1530]/60 sm:flex">
          <a href="#how" className="hover:text-[#0a1530]">How it works</a>
          <a href="#brands" className="hover:text-[#0a1530]">Brands</a>
          <Link to="/demo" className="hover:text-[#0a1530]">Demo</Link>
        </nav>
        <button
          onClick={downloadExtension}
          className="rounded-full bg-[#0a1530] px-4 py-2 text-[19px] font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Add to Chrome
        </button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="flex min-h-screen flex-col justify-center px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <div
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#1e40af]/20 bg-white/70 px-3.5 py-1.5 text-[16px] uppercase tracking-[0.24em] text-[#0a1530]/75 shadow-[0_8px_24px_-12px_rgba(30,64,175,0.35)] backdrop-blur"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          AI-powered fit engine
        </div>

        <div className="relative isolate">
          <TapeMeasure />
          <h1
            className="relative z-10 text-[60px] font-medium leading-[1.02] tracking-[-0.02em] text-[#0a1530] sm:text-[96px]"
            style={serif}
          >
            Never guess your{" "}
            <span style={serifItalic} className="text-[#1e40af]">size</span>{" "}
            again.
          </h1>
        </div>


        <p className="mx-auto mt-7 max-w-xl text-[19px] leading-[1.55] text-[#0a1530]/80">
          Know your size in any brand, instantly. Your own personal AI shopper —
          built from real fit reviews and the brands you already wear.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={downloadExtension}
            className="rounded-full bg-[#0a1530] px-7 py-3.5 text-[16px] font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Add to Chrome — it's free
          </button>
          <Link
            to="/demo"
            className="group inline-flex items-center gap-1.5 text-[19px] tracking-wide text-[#0a1530]/75 transition-colors duration-500 ease-out hover:text-[#0a1530]"
          >
            <span className="relative">
              or try the live demo
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-[#0a1530]/40 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
            </span>
            <span className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5">
              →
            </span>
          </Link>
        </div>
        <p className="mt-5 text-[16px] text-[#0a1530]/65">
          Join 2,400+ shoppers who stopped guessing their size.
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Tell us what you know",
      copy: "A few sizes from brands you already wear — Zara M, Levi's 28. Or just your measurements.",
    },
    {
      n: "02",
      title: "We do the rest",
      copy: "Our AI cross-references millions of fit reviews and size charts to learn how things run on you.",
    },
    {
      n: "03",
      title: "Your size, on every site",
      copy: "Your size shows up on the product page — with confidence — before you check out.",
    },
  ];
  return (
    <section id="how" className="relative flex min-h-screen flex-col justify-center px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-[19px] uppercase tracking-[0.24em] text-[#0a1530]/65">

            How it works
          </div>
          <h2
            className="mt-4 text-6xl tracking-[-0.02em] text-[#0a1530] sm:text-7xl"

            style={serif}
          >
            It's <span style={serifItalic} className="text-[#1e40af]">that</span> simple.
          </h2>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-[#0a1530]/10 bg-[#0a1530]/10 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="bg-white/70 p-10 backdrop-blur sm:p-12">
              <div
                className="text-[19px] tracking-[0.3em] text-[#1e40af]"
                style={serif}
              >
                {s.n}
              </div>
              <h3
                className="mt-6 text-4xl tracking-tight text-[#0a1530]"
                style={serif}
              >
                {s.title}
              </h3>
              <p className="mt-4 text-[19px] leading-[1.65] text-[#0a1530]/80">
                {s.copy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Brands() {
  const brands = [
    "Zara", "Levi's", "Uniqlo", "COS", "Aritzia", "Acne Studios",
    "Reformation", "Mango", "& Other Stories", "Everlane", "Madewell",
    "H&M", "Massimo Dutti", "Sezane", "Ganni", "Arket",
    "J.Crew", "AG Jeans", "Theory", "Lululemon",
  ];
  return (
    <section id="brands" className="flex min-h-screen flex-col justify-center px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-[19px] uppercase tracking-[0.24em] text-[#0a1530]/65">

            Brands
          </div>
          <h2
            className="mt-4 text-4xl tracking-[-0.02em] text-[#0a1530] sm:text-5xl"

            style={serif}
          >
            Every brand you{" "}
            <span style={serifItalic} className="text-[#1e40af]">already wear</span>.
          </h2>
          <p className="mt-3 text-[19px] text-[#0a1530]/75">
            Works on 200+ stores. A taste below.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12">
          {brands.map((b) => (
            <span
              key={b}
              className="text-[22px] tracking-tight text-[#0a1530]/85 transition-colors hover:text-[#1e40af] sm:text-[26px]"
              style={serifItalic}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Personal() {
  const [tab, setTab] = useState<"brands" | "measure">("brands");
  return (
    <section className="relative flex min-h-screen flex-col justify-center px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-[19px] uppercase tracking-[0.24em] text-[#0a1530]/65">
          Personal shopper
        </div>
        <h2
          className="mt-4 text-5xl tracking-[-0.02em] text-[#0a1530] sm:text-6xl"
          style={serif}
        >
          Your <span style={serifItalic} className="text-[#1e40af]">own</span>{" "}
          personal shopper.
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-[19px] leading-[1.65] text-[#0a1530]/80">
          Tell us the brands you wear, or your measurements. Either way, you'll
          never guess again.
        </p>

        <div className="mt-10 inline-flex rounded-full border border-[#0a1530]/15 p-1 text-[16px]">
          <button
            onClick={() => setTab("brands")}
            className={`rounded-full px-5 py-1.5 transition-colors ${
              tab === "brands" ? "bg-[#0a1530] text-white" : "text-[#0a1530]/65 hover:text-[#0a1530]"
            }`}
          >
            Sizes I know
          </button>
          <button
            onClick={() => setTab("measure")}
            className={`rounded-full px-5 py-1.5 transition-colors ${
              tab === "measure" ? "bg-[#0a1530] text-white" : "text-[#0a1530]/65 hover:text-[#0a1530]"
            }`}
          >
            My measurements
          </button>
        </div>

        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-[#0a1530]/10 bg-white/60 p-6 text-left backdrop-blur">
          {tab === "brands" ? (
            <div className="space-y-2.5">
              {[
                { brand: "Zara", size: "M" },
                { brand: "Levi's", size: "28" },
                { brand: "Uniqlo", size: "S" },
              ].map((r) => (
                <div
                  key={r.brand}
                  className="flex items-center justify-between rounded-xl bg-[#0a1530]/[0.04] px-4 py-3"
                >
                  <span className="text-base text-[#0a1530]">{r.brand}</span>
                  <span className="rounded-md bg-[#0a1530] px-2.5 py-1 text-[19px] font-bold text-white">
                    {r.size}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: "Bust", v: "86 cm" },
                { l: "Waist", v: "68 cm" },
                { l: "Hips", v: "94 cm" },
                { l: "Inseam", v: "78 cm" },
              ].map((m) => (
                <div key={m.l} className="rounded-xl bg-[#0a1530]/[0.04] p-4">
                  <div className="text-[16px] uppercase tracking-[0.2em] text-[#0a1530]/45">
                    {m.l}
                  </div>
                  <div className="mt-1 text-2xl tracking-tight text-[#0a1530]" style={serif}>
                    {m.v}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative flex min-h-screen flex-col justify-center px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2
          className="text-6xl tracking-[-0.02em] text-[#0a1530] sm:text-7xl"
          style={serif}
        >
          Stop ordering{" "}
          <span style={serifItalic} className="text-[#1e40af]">multiple sizes</span>{" "}
          to test.
        </h2>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={downloadExtension}
            className="rounded-full bg-[#0a1530] px-7 py-3.5 text-[16px] font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Add to Chrome — it's free
          </button>
          <Link
            to="/demo"
            className="group inline-flex items-center gap-1.5 text-[19px] tracking-wide text-[#0a1530]/75 transition-colors duration-500 ease-out hover:text-[#0a1530]"

          >
            <span className="relative">
              or try the demo
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-[#0a1530]/40 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
            </span>
            <span className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#0a1530]/10 px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <Logo size="sm" variant="dark" />
        <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[19px] text-[#0a1530]/55">
          <a href="#how" className="hover:text-[#0a1530]">How it works</a>
          <a href="#brands" className="hover:text-[#0a1530]">Brands</a>
          <Link to="/demo" className="hover:text-[#0a1530]">Demo</Link>
          <a href="mailto:hi@fitsize.com" className="hover:text-[#0a1530]">hi@fitsize.com</a>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-6xl text-[19px] uppercase tracking-[0.22em] text-[#0a1530]/35">
        © 2026 FitSize AI
      </div>
    </footer>
  );
}
