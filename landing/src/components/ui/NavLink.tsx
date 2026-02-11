"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export default function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`text-sm transition-colors duration-150 ${
        isActive
          ? "font-medium text-foreground"
          : "text-text-secondary hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
