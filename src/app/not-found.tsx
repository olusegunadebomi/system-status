import Link from "next/link";
import { Card } from "@/features/system-status/components/card";

export default function NotFound() {
  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <p className="text-sm font-semibold text-muted">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-2 text-secondary">This incident or page doesn&apos;t exist, or it may have been removed.</p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center rounded-full bg-primary-500 px-5 text-sm font-semibold text-white hover:bg-primary-600"
      >
        View current status
      </Link>
    </Card>
  );
}
