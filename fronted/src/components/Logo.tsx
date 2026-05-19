import { Link } from "@tanstack/react-router";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
  asLink?: boolean;
};

const sizeMap = {
  sm: "text-[18px]",
  md: "text-[22px]",
  lg: "text-[28px]",
};

const dotSizeMap = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

export function Logo({ size = "md", variant = "dark", asLink = true }: LogoProps) {
  const color = variant === "dark" ? "text-black" : "text-white";
  const accent = variant === "dark" ? "text-[#1e40af]" : "text-[#7aa2ff]";
  const content = (
    <span
      className={`inline-flex items-center gap-2 font-bold tracking-tight ${sizeMap[size]} ${color} select-none`}
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      <span>
        FitSize<span className={accent}> </span>AI
      </span>
      <span
        aria-hidden="true"
        className={`relative inline-flex ${dotSizeMap[size]}`}
        title="Live"
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
        <span className={`relative inline-flex rounded-full bg-emerald-500 ${dotSizeMap[size]}`} />
      </span>
    </span>
  );
  if (!asLink) return content;
  return <Link to="/">{content}</Link>;
}
