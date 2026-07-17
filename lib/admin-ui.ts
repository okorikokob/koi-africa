// Rotates the avatar accent per customer so tables read as lively, not flat.
const AVATAR_CLASSES = [
  "bg-primary-soft text-primary",
  "bg-info/10 text-info",
  "bg-success/10 text-success",
  "bg-warning/10 text-warning",
];

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function avatarClass(name: string): string {
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_CLASSES[hash % AVATAR_CLASSES.length];
}
