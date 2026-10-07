import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let seq = 0;
export function uid(prefix = "id"): string {
  seq += 1;
  return `${prefix}-${seq}`;
}
