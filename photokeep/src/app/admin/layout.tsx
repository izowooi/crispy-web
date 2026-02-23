export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-lg">{children}</div>
    </div>
  );
}
