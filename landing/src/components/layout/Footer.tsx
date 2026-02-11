import Link from "next/link";
import Container from "./Container";

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <Container>
        <div className="py-8 flex flex-col items-center gap-4 text-sm text-text-secondary">
          <div className="flex gap-6">
            <Link
              href="/ko/terms"
              className="hover:text-foreground transition-colors duration-150"
            >
              Terms of Service
            </Link>
            <Link
              href="/ko/privacy"
              className="hover:text-foreground transition-colors duration-150"
            >
              Privacy Policy
            </Link>
          </div>
          <p>&copy; 2026 izowooi</p>
        </div>
      </Container>
    </footer>
  );
}
