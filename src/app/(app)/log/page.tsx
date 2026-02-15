"use client";

import { useMemo, useState, useEffect } from "react";
import { ShotForm } from "@/components/shots/form/ShotForm";

const ENCOURAGING_PHRASES = [
  "Time to dial in something delicious",
  "Every shot is a step toward perfection",
  "Your next great espresso starts here",
  "Track it, tweak it, taste the difference",
  "Let's capture some coffee magic",
  "Good data makes great espresso",
  "Another day, another chance to nail it",
  "Your palate is getting sharper every shot",
  "Precision meets passion — log your pull",
  "The grind never stops (pun intended)",
  "Chase that perfect extraction",
  "Small adjustments, big flavor changes",
  "Document the journey to your best cup",
  "Espresso is an art — here's your canvas",
  "Ready to pull something special?",
];

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    if (!text) return;

    const charDelay = Math.min(60, 1800 / text.length);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, charDelay);

    return () => clearInterval(id);
  }, [text]);

  return <span>{displayed}</span>;
}

export default function LogPage() {
  const phrase = useMemo(
    () => ENCOURAGING_PHRASES[Math.floor(Math.random() * ENCOURAGING_PHRASES.length)],
    []
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Espresso Log
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          <TypewriterText text={phrase} />
        </p>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <ShotForm />
      </div>
    </div>
  );
}
