"use client";

import { useEffect } from "react";
import { Card } from "@/features/system-status/components/card";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Unable to load status</h1>
      <p className="mt-2 text-secondary">Something went wrong while loading this page.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 inline-flex h-10 items-center rounded-full bg-primary-500 px-5 text-sm font-semibold text-white hover:bg-primary-600"
      >
        Try again
      </button>
    </Card>
  );
}
