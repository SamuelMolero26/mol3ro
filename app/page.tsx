import { DesktopEnvironment } from "@/components/desktop/DesktopEnvironment";
import { MobileFrame } from "@/components/mobile/MobileFrame";

export default function Home() {
  return (
    <main id="main-content" className="min-h-dvh">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <div className="md:hidden">
        <MobileFrame />
      </div>

      <div className="hidden md:block">
        <DesktopEnvironment />
      </div>
    </main>
  );
}
