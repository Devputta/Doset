"use client";

const KEY = "docent:preferences";

export interface UserPreferences {
  showSuggestedQuestions: boolean;
}

const DEFAULTS: UserPreferences = { showSuggestedQuestions: true };

export function getPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function setPreferences(next: Partial<UserPreferences>): UserPreferences {
  const merged = { ...getPreferences(), ...next };
  window.localStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}
