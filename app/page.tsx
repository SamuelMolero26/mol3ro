import { ResponsiveShell } from "@/components/ResponsiveShell";

export default function Home() {
  return (
    <main id="main-content" className="min-h-dvh">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <ResponsiveShell />
    </main>
  );
}
