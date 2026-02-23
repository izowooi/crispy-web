interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
