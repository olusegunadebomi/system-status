"use client";

import axios from "axios";
import { Bell, Rss, X } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

export function SubscribeButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const errorId = useId();

  const close = () => dialogRef.current?.close();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post("/api/subscribe", { email: email.trim() });
      toast.success("Check your inbox to confirm your subscription.");
      setEmail("");
      close();
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setError(
        status === 429
          ? "Too many attempts. Please try again later."
          : status === 400
            ? "Enter a valid email address."
            : "We couldn't subscribe you right now. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-primary-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
      >
        <Bell aria-hidden className="size-4" />
        <span className="max-[400px]:sr-only">Subscribe</span>
        <span className="sr-only"> to updates</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(e) => e.target === dialogRef.current && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-grouped-card p-0 text-foreground shadow-xl backdrop:bg-black/50"
      >
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">
                Subscribe to updates
              </h2>
              <p className="mt-1 text-sm text-secondary">Get an email when Golvia posts an incident or schedules maintenance.</p>
            </div>
            <button type="button" onClick={close} aria-label="Close" className="rounded-full p-1.5 text-muted hover:bg-fill hover:text-foreground">
              <X aria-hidden className="size-5" />
            </button>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-3">
            <label className="block text-sm font-medium text-foreground-soft">
              Email address
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                placeholder="you@example.com"
                className="mt-1.5 block h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground placeholder:text-subtle focus:border-primary-500 focus:outline-none"
              />
            </label>
            {error && (
              <p id={errorId} role="alert" className="text-sm text-status-major">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-xl bg-primary-500 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
            >
              {submitting ? "Subscribing…" : "Subscribe"}
            </button>
          </form>

          <div className="mt-4 border-t border-divider pt-4">
            <a href="/feed.xml" className="inline-flex items-center gap-2 text-sm font-medium text-link hover:text-link-hover">
              <Rss aria-hidden className="size-4" />
              Subscribe with RSS
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
