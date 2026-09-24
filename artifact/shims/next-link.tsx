import type { AnchorHTMLAttributes } from "react";
import { router } from "../router";

/** next/link for the single-file build: same API, in-memory navigation. */
export default function Link({ href, onClick, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        router.navigate(href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
