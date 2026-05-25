export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center p-4">
      {children}
    </div>
  );
}
