import Link from "next/link";
import Container from "./Container";
// import NavLink from "@/components/ui/NavLink";
// import MobileNav from "./MobileNav";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <Container>
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight"
          >
            izowooi
          </Link>
          {/* <nav className="hidden md:flex items-center gap-8">
            <NavLink href="/about-me">About me</NavLink>
            <NavLink href="/apps">Apps</NavLink>
          </nav>
          <MobileNav /> */}
        </div>
      </Container>
    </header>
  );
}
