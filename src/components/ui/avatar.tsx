import * as React from "react";
import { cn } from "@/utils/cn";
import { initials } from "@/utils/text";

type AvatarProps = {
  name: string;
  src?: string | null;
  color?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZES = { xs: "size-6 text-[0.6rem]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-20 text-2xl" };

/** Avatar com foto ou iniciais sobre a cor da profissional. */
function Avatar({ name, src, color, size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold tracking-wide text-white ring-2 ring-card",
        SIZES[size],
        className,
      )}
      style={{ background: color ? `linear-gradient(145deg, ${color}, ${color}cc)` : "linear-gradient(145deg,#9c7248,#7f5c3a)" }}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export { Avatar };
