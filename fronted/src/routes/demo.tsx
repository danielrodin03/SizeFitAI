import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/demo")({
  component: Index,
  head: () => ({
    meta: [
      { title: "FitSize – AI Sizing for Fashion" },
      {
        name: "description",
        content:
          "FitSize AI predicts your clothing size across brands based on sizes you already know.",
      },
    ],
  }),
});

const serif = { fontFamily: '"GT Sectra", "Times New Roman", Georgia, serif' } as const;


const PROFILE_BRANDS = [
  "Zara",
  "H&M",
  "ASOS",
  "Revolve",
  "Levi's",
  "Uniqlo",
  "Aritzia",
  "COS",
  "Mango",
];

const SHOP_BRANDS = [
  "Zara",
  "H&M",
  "ASOS",
  "Revolve",
  "Levi's",
  "Uniqlo",
  "Aritzia",
  "COS",
  "Mango",
  "Nike",
  "Adidas",
  "Forever 21",
  "Shein",
  "Topshop",
  "Urban Outfitters",
];

const ITEM_TYPES = ["Top", "Bottom", "Dress", "Outerwear"];

const FIT_PREFS = [
  "Relaxed",
  "True to size",
  "Fitted",
  "Oversized",
  "Depends on the item",
];

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];

const BRAND_NOTES: Record<string, string> = {
  Zara: "Zara tends to run small, especially in tops and dresses. Consider sizing up if between sizes.",
  "H&M": "H&M sizing is inconsistent across lines but generally runs slightly small.",
  ASOS: "ASOS is true-to-size with a generous fit on their own brand.",
  Revolve: "Revolve carries many designers — fits vary, but most styles run true-to-size.",
  "Levi's": "Levi's denim is true-to-waist; expect some stretch on stretch styles.",
  Uniqlo: "Uniqlo runs true-to-size with a slightly slim, Asian-influenced cut.",
  Aritzia: "Aritzia runs true-to-size with a fitted silhouette across most brands.",
  COS: "COS runs true-to-size with a relaxed, minimalist cut.",
  Mango: "Mango runs slightly small in tops, true-to-size in bottoms.",
  Nike: "Nike apparel runs true-to-size; activewear is fitted.",
  Adidas: "Adidas apparel runs slightly large; consider sizing down.",
  "Forever 21": "Forever 21 runs small — sizing up is often recommended.",
  Shein: "Shein runs very small and inconsistently — check garment measurements.",
  Topshop: "Topshop runs true-to-size with a slim fit through the body.",
  "Urban Outfitters": "Urban Outfitters runs slightly oversized for a relaxed look.",
};

const ALPHA_SHIFT: Record<string, number> = {
  Zara: 1,
  "H&M": 1,
  "Forever 21": 1,
  Shein: 2,
  Adidas: -1,
  "Urban Outfitters": -1,
  COS: 0,
  Uniqlo: 0,
  Mango: 0,
  ASOS: 0,
  Revolve: 0,
  Aritzia: 0,
  Nike: 0,
  Topshop: 0,
  "Levi's": 0,
};

function shiftSize(size: string, shift: number) {
  const upper = size.trim().toUpperCase();
  const idx = SIZE_ORDER.indexOf(upper);
  if (idx === -1) return size.trim();
  const next = Math.max(0, Math.min(SIZE_ORDER.length - 1, idx + shift));
  return SIZE_ORDER[next];
}

function predictSize(
  profile: Record<string, string>,
  fitPref: string,
  targetBrand: string,
) {
  const entries = Object.entries(profile).filter(([, v]) => v.trim());
  if (entries.length === 0) {
    return { size: "—", confidence: 0 };
  }

  const alphaEntry = entries.find(([, v]) =>
    SIZE_ORDER.includes(v.trim().toUpperCase()),
  );

  let baseSize: string;
  if (alphaEntry) {
    const [brand, val] = alphaEntry;
    const fromShift = ALPHA_SHIFT[brand] ?? 0;
    const neutral = shiftSize(val, -fromShift);
    const toShift = ALPHA_SHIFT[targetBrand] ?? 0;
    baseSize = shiftSize(neutral, toShift);
  } else {
    baseSize = entries[0][1].trim();
  }

  if (fitPref === "Oversized" && SIZE_ORDER.includes(baseSize)) {
    baseSize = shiftSize(baseSize, 1);
  } else if (fitPref === "Fitted" && SIZE_ORDER.includes(baseSize)) {
    baseSize = shiftSize(baseSize, -1);
  }

  const confidence = Math.min(
    95,
    60 + entries.length * 6 + (alphaEntry ? 8 : 0),
  );

  return { size: baseSize, confidence };
}

type Mode = "brands" | "measurements";

function Index() {
  const [mode, setMode] = useState<Mode>("brands");

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [otherProfileBrand, setOtherProfileBrand] = useState("");
  const [includeOtherProfile, setIncludeOtherProfile] = useState(false);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [itemTypes, setItemTypes] = useState<Record<string, string>>({});

  const [measurements, setMeasurements] = useState<Record<string, string>>({});

  const [fitPref, setFitPref] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  const [shopBrand, setShopBrand] = useState("");
  const [otherShopBrand, setOtherShopBrand] = useState("");
  const [result, setResult] = useState<{
    brand: string;
    size: string;
    confidence: number;
    note: string;
  } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeProfileBrands = useMemo(() => {
    const list = [...selectedBrands];
    if (includeOtherProfile && otherProfileBrand.trim()) {
      list.push(otherProfileBrand.trim());
    }
    return list;
  }, [selectedBrands, includeOtherProfile, otherProfileBrand]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand],
    );
  };

  const filledCount = useMemo(() => {
    if (mode === "brands") {
      return activeProfileBrands.filter((b) => (sizes[b] ?? "").trim()).length;
    }
    return Object.values(measurements).filter((v) => v.trim()).length;
  }, [mode, activeProfileBrands, sizes, measurements]);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    const defaultTarget =
      SHOP_BRANDS.find((b) => !activeProfileBrands.includes(b)) ?? "Zara";
    const { size, confidence } = predictSize(sizes, fitPref, defaultTarget);
    const note =
      BRAND_NOTES[defaultTarget] ??
      "Reviews suggest this runs slightly small — we recommend sizing up.";
    setShopBrand(defaultTarget);
    setResult({ brand: defaultTarget, size, confidence, note });
    setFeedback(null);
    setTimeout(() => {
      document
        .getElementById("recommend")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleRecommend = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBrand =
      shopBrand === "Other" ? otherShopBrand.trim() : shopBrand;
    if (!finalBrand) return;
    const { size, confidence } = predictSize(sizes, fitPref, finalBrand);
    const note =
      BRAND_NOTES[finalBrand] ??
      "Limited data on this brand — start with your usual size and check return policy.";
    setResult({ brand: finalBrand, size, confidence, note });
    setFeedback(null);
  };

  const canSubmitProfile =
    mode === "brands"
      ? filledCount > 0
      : filledCount > 0;

  const accuracyLabel =
    filledCount === 0
      ? "Add at least one to get started"
      : filledCount === 1
        ? "Good — add one more for better accuracy"
        : filledCount === 2
          ? "Great — two is enough to predict well"
          : "Excellent — more sizes means more accuracy";

  return (
    <div
      className="min-h-screen bg-[#fafafa] text-[#0a1530] antialiased"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div className="mx-auto w-full max-w-[640px] px-5 py-10 sm:py-14">
        {/* Header */}
        <header className="mb-12 flex items-center justify-between">
          <Logo size="md" variant="dark" />
          <Link
            to="/"
            className="text-[14px] text-[#0a1530]/55 transition-colors hover:text-[#0a1530]"
          >
            ← Back
          </Link>
        </header>

        {/* Section 1: Profile */}
        <section className="mb-12">
          <div className="text-[13px] uppercase tracking-[0.24em] text-[#0a1530]/45">
            Step 1
          </div>
          <h2 style={serif} className="mt-2 text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-[#0a1530] sm:text-[52px]">
            Tell us what you know.
          </h2>
          <p className="mt-3 text-[17px] leading-[1.55] text-[#0a1530]/70">
            Just <span className="font-semibold text-[#0a1530]">two sizes is enough</span>
            {" "}— say a Zara top and a Levi's jean. The more you add, the more
            accurate our AI gets.
          </p>

          {/* Mode toggle */}
          <div className="mt-7 inline-flex rounded-full border border-[#0a1530]/12 bg-white p-1 text-[14px]">
            <button
              type="button"
              onClick={() => setMode("brands")}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                mode === "brands"
                  ? "bg-[#0a1530] text-white"
                  : "text-[#0a1530]/65 hover:text-[#0a1530]"
              }`}
            >
              Sizes I know
            </button>
            <button
              type="button"
              onClick={() => setMode("measurements")}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                mode === "measurements"
                  ? "bg-[#0a1530] text-white"
                  : "text-[#0a1530]/65 hover:text-[#0a1530]"
              }`}
            >
              My measurements
            </button>
          </div>

          <form onSubmit={handleProfileSubmit} className="mt-8 space-y-8">
            {mode === "brands" && (
              <>
                <fieldset>
                  <legend className="text-[15px] font-medium text-[#0a1530]">
                    Pick brands you've worn
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {PROFILE_BRANDS.map((brand) => {
                      const active = selectedBrands.includes(brand);
                      return (
                        <button
                          type="button"
                          key={brand}
                          onClick={() => toggleBrand(brand)}
                          className={`rounded-full border px-3.5 py-1.5 text-[15px] transition-colors ${
                            active
                              ? "border-[#0a1530] bg-[#0a1530] text-white"
                              : "border-[#0a1530]/15 bg-white text-[#0a1530]/75 hover:border-[#0a1530]/35"
                          }`}
                        >
                          {brand}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setIncludeOtherProfile((v) => !v)}
                      className={`rounded-full border px-3.5 py-1.5 text-[15px] transition-colors ${
                        includeOtherProfile
                          ? "border-[#0a1530] bg-[#0a1530] text-white"
                          : "border-dashed border-[#0a1530]/25 bg-white text-[#0a1530]/65 hover:border-[#0a1530]/45"
                      }`}
                    >
                      + Other
                    </button>
                  </div>
                  {includeOtherProfile && (
                    <input
                      type="text"
                      placeholder="Brand name"
                      value={otherProfileBrand}
                      onChange={(e) => setOtherProfileBrand(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-[#0a1530]/15 bg-white px-3.5 py-2.5 text-[16px] text-[#0a1530] outline-none placeholder:text-[#0a1530]/35 focus:border-[#0a1530]"
                    />
                  )}
                </fieldset>

                {activeProfileBrands.length > 0 && (
                  <fieldset>
                    <legend className="text-[15px] font-medium text-[#0a1530]">
                      What size did you wear, and what was it?
                    </legend>
                    <div className="mt-3 space-y-2">
                      {activeProfileBrands.map((brand) => (
                        <div
                          key={brand}
                          className="grid grid-cols-[1fr_auto_auto] items-center gap-2"
                        >
                          <div className="rounded-lg border border-[#0a1530]/12 bg-white px-3.5 py-2.5 text-[16px] text-[#0a1530]">
                            {brand}
                          </div>
                          <select
                            value={itemTypes[brand] ?? ""}
                            onChange={(e) =>
                              setItemTypes((prev) => ({
                                ...prev,
                                [brand]: e.target.value,
                              }))
                            }
                            className="w-[110px] rounded-lg border border-[#0a1530]/15 bg-white px-3 py-2.5 text-[16px] text-[#0a1530] outline-none focus:border-[#0a1530]"
                          >
                            <option value="">Item…</option>
                            {ITEM_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={sizes[brand] ?? ""}
                            onChange={(e) =>
                              setSizes((prev) => ({
                                ...prev,
                                [brand]: e.target.value,
                              }))
                            }
                            placeholder="Size"
                            className="w-[90px] rounded-lg border border-[#0a1530]/15 bg-white px-3 py-2.5 text-center text-[16px] text-[#0a1530] outline-none placeholder:text-[#0a1530]/35 focus:border-[#0a1530]"
                          />
                        </div>
                      ))}
                    </div>
                  </fieldset>
                )}
              </>
            )}

            {mode === "measurements" && (
              <fieldset>
                <legend className="text-[15px] font-medium text-[#0a1530]">
                  Add what you know — skip the rest
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { key: "bust", label: "Bust" },
                    { key: "waist", label: "Waist" },
                    { key: "hips", label: "Hips" },
                    { key: "inseam", label: "Inseam" },
                    { key: "height", label: "Height" },
                    { key: "weight", label: "Weight" },
                  ].map((m) => (
                    <label key={m.key} className="block">
                      <span className="mb-1 block text-[13px] uppercase tracking-[0.18em] text-[#0a1530]/55">
                        {m.label}
                      </span>
                      <input
                        type="text"
                        value={measurements[m.key] ?? ""}
                        onChange={(e) =>
                          setMeasurements((prev) => ({
                            ...prev,
                            [m.key]: e.target.value,
                          }))
                        }
                        placeholder={
                          m.key === "height"
                            ? "5'7\""
                            : m.key === "weight"
                              ? "140 lb"
                              : "—"
                        }
                        className="w-full rounded-lg border border-[#0a1530]/15 bg-white px-3.5 py-2.5 text-[16px] text-[#0a1530] outline-none placeholder:text-[#0a1530]/35 focus:border-[#0a1530]"
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset>
              <legend className="text-[15px] font-medium text-[#0a1530]">
                Fit preference{" "}
                <span className="font-normal text-[#0a1530]/45">(optional)</span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {FIT_PREFS.map((pref) => (
                  <button
                    type="button"
                    key={pref}
                    onClick={() => setFitPref(pref === fitPref ? "" : pref)}
                    className={`rounded-full border px-3.5 py-1.5 text-[15px] transition-colors ${
                      fitPref === pref
                        ? "border-[#0a1530] bg-[#0a1530] text-white"
                        : "border-[#0a1530]/15 bg-white text-[#0a1530]/75 hover:border-[#0a1530]/35"
                    }`}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Accuracy meter */}
            <div className="rounded-xl border border-[#0a1530]/10 bg-white px-4 py-3">
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-[#0a1530]/65">Profile strength</span>
                <span className="font-medium text-[#0a1530]">
                  {Math.min(100, filledCount * 25)}%
                </span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#0a1530]/[0.08]">
                <div
                  className="h-full rounded-full bg-[#1e40af] transition-all duration-500"
                  style={{ width: `${Math.min(100, filledCount * 25)}%` }}
                />
              </div>
              <div className="mt-2 text-[14px] text-[#0a1530]/60">{accuracyLabel}</div>
            </div>

            <button
              type="submit"
              disabled={!canSubmitProfile}
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#0a1530] px-6 py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:bg-[#0a1530]/20 disabled:text-white/70"
            >
              Let our AI figure out my size
              <span className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">→</span>
            </button>
          </form>
        </section>

        {/* Section 2: Recommendation */}
        {profileSaved && (
          <section id="recommend" className="mb-12">
            <div className="text-[13px] uppercase tracking-[0.24em] text-[#0a1530]/45">
              Step 2
            </div>
            <h2 style={serif} className="mt-2 text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-[#0a1530] sm:text-[52px]">
              Your size, in any brand.
            </h2>
            <p className="mt-3 text-[17px] text-[#0a1530]/70">
              Pick a brand — we'll predict your size instantly.
            </p>

            <form onSubmit={handleRecommend} className="mt-7 space-y-3">
              <select
                value={shopBrand}
                onChange={(e) => setShopBrand(e.target.value)}
                className="w-full appearance-none rounded-lg border border-[#0a1530]/15 bg-white bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path fill=%22%230a1530%22 d=%22M2 4l4 4 4-4z%22/></svg>')] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat px-3.5 py-3 pr-10 text-[16px] text-[#0a1530] outline-none focus:border-[#0a1530]"
              >
                <option value="">Select a brand…</option>
                {SHOP_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
              {shopBrand === "Other" && (
                <input
                  type="text"
                  placeholder="Brand name"
                  value={otherShopBrand}
                  onChange={(e) => setOtherShopBrand(e.target.value)}
                  className="w-full rounded-lg border border-[#0a1530]/15 bg-white px-3.5 py-3 text-[16px] text-[#0a1530] outline-none placeholder:text-[#0a1530]/35 focus:border-[#0a1530]"
                />
              )}
              <button
                type="submit"
                className="w-full rounded-full bg-[#0a1530] px-6 py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#1e40af]"
              >
                Get my size
              </button>
            </form>

            {result && (
              <div className="mt-8 rounded-2xl border border-[#0a1530]/10 bg-white p-6 sm:p-8">
                <div className="text-[13px] uppercase tracking-[0.24em] text-[#0a1530]/55">
                  AI prediction
                </div>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-[56px] font-semibold leading-none tracking-tight text-[#1e40af]">
                    {result.size}
                  </span>
                  <span className="text-[16px] text-[#0a1530]/65">
                    in {result.brand}
                  </span>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between text-[14px] text-[#0a1530]/65">
                    <span>Confidence</span>
                    <span className="font-medium text-[#0a1530]">
                      {result.confidence}%
                    </span>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#0a1530]/[0.08]">
                    <div
                      className="h-full rounded-full bg-[#1e40af] transition-all duration-700"
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                </div>

                <p className="mt-6 border-t border-[#0a1530]/[0.08] pt-5 text-[15px] leading-relaxed text-[#0a1530]/70">
                  {result.note}
                </p>

                <div className="mt-6">
                  <div className="mb-2 text-[14px] text-[#0a1530]/55">
                    How did it fit?
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["Too small", "Perfect", "Too big"].map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setFeedback(label)}
                        className={`rounded-lg border px-3 py-2 text-[15px] transition-colors ${
                          feedback === label
                            ? "border-[#0a1530] bg-[#0a1530] text-white"
                            : "border-[#0a1530]/15 bg-white text-[#0a1530]/70 hover:border-[#0a1530]/35"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {feedback && (
                  <div className="mt-4 text-[14px] text-[#0a1530]/55">
                    Thanks — this helps our AI learn.
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <footer className="mt-20 border-t border-[#0a1530]/10 pt-6 text-center">
          <div className="flex justify-center">
            <Logo size="sm" variant="dark" />
          </div>
          <div className="mt-3 text-[13px] uppercase tracking-[0.22em] text-[#0a1530]/45">
            AI sizing for fashion · hi@fitsize.com
          </div>
        </footer>
      </div>
    </div>
  );
}
