"use client";

import { useState, useEffect } from "react";
import { ShotForm } from "@/components/shots/form/ShotForm";
import { getRandomLogPhrase } from "@/lib/log-phrases";

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
  const [phrase] = useState(getRandomLogPhrase);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-200">
          Espresso Log
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          <TypewriterText text={phrase} />
        </p>
      </div>
      <ShotForm phrase={phrase} />
    </div>
  );
}
