interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`border border-border rounded-lg p-6 transition-colors duration-150 hover:bg-neutral-50 ${className}`}
    >
      {children}
    </div>
  );
}
