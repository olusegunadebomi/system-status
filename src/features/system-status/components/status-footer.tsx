"use client";

import { useLastChecked } from "../hooks/use-status";
import { publicEnv } from "../lib/public-env";
import { LocalDateTime } from "./time";

export function StatusFooter() {
  const lastChecked = useLastChecked();
  const appUrl = publicEnv.appUrl;
  const appHost = appUrl.replace(/^https?:\/\//, "");

  return (
    <footer className="mt-12">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-10 text-sm">
        <p className="text-muted">{lastChecked && <>Last checked <LocalDateTime iso={lastChecked} /></>}</p>
        <a href={appUrl} className="font-medium text-link hover:text-link-hover hover:underline">
          {appHost}
        </a>
      </div>
    </footer>
  );
}
