"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

/** Which frame the artwork is being born into. */
export type PressAspect = "square" | "portrait";

export type Artifact = {
  status: "printing" | "ready" | "error";
  /** Data URL of the finished print (present once status === "ready"). */
  url?: string;
  /** The composed brief the engine printed from — kept so a re-print or a
   *  caption can reference what was asked for. */
  brief: string;
  aspect: PressAspect;
};

type PressState = {
  /** Latest artifact per engine id. */
  artifacts: Record<string, Artifact>;
  /** Ask an engine to print. The brief arrives already composed by the
   *  engine's own brain in chat; style DNA is re-attached server-side. */
  print: (engineId: string, brief: string, aspect: PressAspect) => void;
};

const PressContext = createContext<PressState | null>(null);

/**
 * The press's single source of truth.
 *
 * One owner, many views: the feed card, the expanded sheet, the overview
 * thumbnails and the in-chat buy card all read the SAME artifact, so what an
 * engine prints follows its card everywhere — including across the mobile ⇄
 * desktop breakpoint, where two separately-owned copies of this state would
 * silently split (the lifted-owner law from the concierge).
 *
 * Artifacts are per-ENGINE, not per-conversation: asking the Modernist for a
 * new poster replaces its plate, which is the right mental model for a machine
 * with one output tray.
 */
export function PressProvider({ children }: { children: ReactNode }) {
  const [artifacts, setArtifacts] = useState<Record<string, Artifact>>({});
  // One in-flight print per engine; a newer request supersedes the older one.
  const inflight = useRef<Record<string, AbortController>>({});

  const print = useCallback((engineId: string, brief: string, aspect: PressAspect) => {
    inflight.current[engineId]?.abort();
    const controller = new AbortController();
    inflight.current[engineId] = controller;

    setArtifacts((a) => ({ ...a, [engineId]: { status: "printing", brief, aspect } }));

    fetch("/api/press", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ engineId, prompt: brief, aspect }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.image) throw new Error(json?.error ?? "print failed");
        setArtifacts((a) => ({ ...a, [engineId]: { status: "ready", url: json.image, brief, aspect } }));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setArtifacts((a) => ({ ...a, [engineId]: { status: "error", brief, aspect } }));
      });
  }, []);

  return <PressContext.Provider value={{ artifacts, print }}>{children}</PressContext.Provider>;
}

export function usePress(): PressState {
  const ctx = useContext(PressContext);
  if (!ctx) throw new Error("usePress must be used inside <PressProvider>");
  return ctx;
}

/** The latest artifact for one engine (or undefined if it has never printed). */
export function useArtifact(engineId: string): Artifact | undefined {
  return usePress().artifacts[engineId];
}

/** Trigger a browser download of a finished print. */
export function downloadArtifact(engineId: string, artifact: Artifact) {
  if (!artifact.url) return;
  const a = document.createElement("a");
  a.href = artifact.url;
  a.download = `${engineId}-one-of-one.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
