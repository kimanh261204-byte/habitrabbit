import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

export function truncate(str: string, maxLen: number) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

export function normalizeWord(word: string) {
  return word.toLowerCase().trim();
}

export function isAnswerCorrect(
  userAnswer: string,
  expectedAnswer: string,
  alternatives: string[] = []
): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, " ");
  const ua = normalize(userAnswer);
  const ea = normalize(expectedAnswer);
  if (ua === ea) return true;
  return alternatives.some((alt) => normalize(alt) === ua);
}

export function formatProgress(done: number, total: number) {
  if (total === 0) return "0%";
  return Math.round((done / total) * 100) + "%";
}

export function generateLessonTitle(index: number) {
  return `Bài ${index + 1}`;
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
