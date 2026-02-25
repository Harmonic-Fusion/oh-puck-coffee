import { LandingNav } from "@/components/landing/LandingNav";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      <LandingNav />
      {children}
    </div>
  );
}
