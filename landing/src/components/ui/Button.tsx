import Link from "next/link";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  href?: string;
  className?: string;
}

export default function Button({
  children,
  variant = "primary",
  href,
  className = "",
}: ButtonProps) {
  const base =
    "px-6 py-3 text-sm font-medium inline-flex items-center justify-center rounded-md transition-all duration-150";
  const variants = {
    primary: "bg-black text-white hover:opacity-90",
    secondary:
      "border border-border text-foreground bg-transparent hover:bg-neutral-50",
  };

  const cls = `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return <button className={cls}>{children}</button>;
}
