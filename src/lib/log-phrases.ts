const PUN_PHRASES = [
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
];

const ENCOURAGING_PHRASES = [
  "Time to dial in something delicious",
  "Every shot is a step toward perfection",
  "Your next great espresso starts here",
  "Track it, tweak it, taste the difference",
  "Let's capture some coffee magic",
  "Good data makes great espresso",
  "Another day, another chance to nail it",
  "I'm so proud of you",
  "You're doing great!",
  "You're a coffee legend!",
];

const KAT_PHRASES = [
  "May this coffee bless you, especially if your name is Kat",
  "All bow before Kat's mighty coffee skills",
  "Tremble mortal, before Kat's wrath",
];

export const LOG_PHRASES = [...ENCOURAGING_PHRASES, ...KAT_PHRASES, ...PUN_PHRASES];

export function getRandomLogPhrase(): string {
  return LOG_PHRASES[Math.floor(Math.random() * LOG_PHRASES.length)];
}
