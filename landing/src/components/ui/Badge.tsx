interface BadgeProps {
  children: React.ReactNode;
}

export default function Badge({ children }: BadgeProps) {
  return (
    <span className="inline-flex text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-100 text-text-secondary">
      {children}
    </span>
  );
}
