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
  "The grind never stops",
  "Chase that perfect extraction",
  "Small adjustments, big flavor changes",
  "Espresso is an art — here's your canvas",
  "Ready to pull something special?",
  "May this coffee bless you, especially if your name is Kat",
  "I'm so proud of you",
  "You're doing great!",
  "You're a coffee legend!",
  "One espresso to rule them all, one to find them, one to bring them all and in the darkness bind them",
  "The coffee gods are smiling on you today",
  "The espresso is strong with this one",
  "Make it so, Number One — pull that shot",
  "Engage! Maximum extraction, warp factor 9",
  "May the extraction be with you",
  "Resistance is futile — this espresso will be assimilated",
  "The answer to life, the universe, and everything? 42 grams",
  "Winter is coming... better make it a double",
  "I find your lack of crema disturbing",
  "Live long and extract",
  "These aren't the beans you're looking for... wait, yes they are",
  "I'll be back... for another shot",
  "This coffee is a gift from the coffee gods",
  "Darkness comes before the dawn",
  "I love you",
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
      <ShotForm />
    </div>
  );
}
