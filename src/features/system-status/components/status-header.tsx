import Image from "next/image";
import Link from "next/link";
import { SubscribeButton } from "./subscribe-dialog";
import { ThemeToggle } from "./theme-toggle";

export function StatusHeader() {
  return (
    <header className="border-b border-border bg-grouped-card/80 backdrop-blur supports-[backdrop-filter]:bg-grouped-card/70">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg" aria-label="Golvia System Status home">
          <Image src="/logo/golviaLogo.svg" alt="" width={31} height={32} priority unoptimized />
          <span className="truncate text-lg font-semibold text-foreground">
            Golvia <span className="font-normal text-muted">Status</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <SubscribeButton />
        </div>
      </div>
    </header>
  );
}
