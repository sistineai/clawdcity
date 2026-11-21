// The one place the app reads the wall clock, so tests can control time.
export const now = (): number => Date.now();
