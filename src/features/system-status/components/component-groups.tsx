"use client";

import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { Activity, ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { decodeComponentUptime } from "../lib/uptime-codec";
import type { CompactUptime, ComponentGroup, IncidentRef, StatusComponent } from "../types";
import { Card } from "./card";
import { StatusPill } from "./status-pill";
import { UptimeBar } from "./uptime-bar";

interface Props {
  groups: ComponentGroup[];
  uptime: CompactUptime | null | undefined;
  incidents: Record<string, IncidentRef>;
}

export function ComponentGroups({ groups, uptime, incidents }: Props) {
  return (
    <LazyMotion features={domAnimation} strict>
      <Card>
        <ul className="divide-y divide-border">
          {groups.map((g) => (
            <GroupAccordion key={g.id} group={g} uptime={uptime} incidents={incidents} />
          ))}
        </ul>
      </Card>
    </LazyMotion>
  );
}

function GroupAccordion({ group, uptime, incidents }: { group: ComponentGroup; uptime: Props["uptime"]; incidents: Props["incidents"] }) {
  // Groups with problems start open so issues are visible without a click.
  const [open, setOpen] = useState(group.status !== "operational" && group.status !== "unknown");
  // Clip only while animating so uptime tooltips can overflow the panel once open.
  const [animating, setAnimating] = useState(false);
  const reduce = useReducedMotion();
  const panelId = useId();

  return (
    <li>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            if (!reduce) setAnimating(true);
            setOpen((o) => !o);
          }}
          className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-fill/60 focus-visible:-outline-offset-2 sm:px-5"
        >
          <ChevronDown
            aria-hidden
            className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
          />
          <span className="min-w-0 flex-1 font-semibold text-foreground">
            {group.name}
            <span className="ml-2 text-sm font-normal text-muted">
              {group.components.length} component{group.components.length === 1 ? "" : "s"}
            </span>
          </span>
          <StatusPill status={group.status} compact />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={panelId}
            key="panel"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onAnimationComplete={() => setAnimating(false)}
            className={animating ? "overflow-hidden" : undefined}
          >
            <ul className="space-y-1 px-4 pb-4 sm:px-5">
              {group.components.map((c) => (
                <ComponentRow key={c.id} component={c} uptime={uptime} incidents={incidents} />
              ))}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function ComponentRow({ component, uptime, incidents }: { component: StatusComponent; uptime: Props["uptime"]; incidents: Props["incidents"] }) {
  return (
    <li className="rounded-xl bg-card p-3 sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            {component.name}
            {component.automated && (
              <span title="Checked automatically every 30 seconds" className="inline-flex text-muted">
                <Activity aria-hidden className="size-3.5" />
                <span className="sr-only">(monitored automatically)</span>
              </span>
            )}
          </p>
          {component.description && <p className="mt-0.5 text-sm text-muted">{component.description}</p>}
        </div>
        <StatusPill status={component.status} />
      </div>
      <UptimeBar componentName={component.name} days={uptime ? decodeComponentUptime(uptime, component.id) : undefined} incidents={incidents} />
    </li>
  );
}
