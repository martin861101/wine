export type ProactiveState = {
  count: number;
  lastAt: number;
  dismissed: boolean;
};

export const initialProactiveState: ProactiveState = { count: 0, lastAt: 0, dismissed: false };

export function parseProactiveState(value: string | null): ProactiveState {
  if (!value) return initialProactiveState;
  try {
    const parsed = JSON.parse(value) as Partial<ProactiveState>;
    return {
      count: Number.isInteger(parsed.count) && Number(parsed.count) >= 0 ? Number(parsed.count) : 0,
      lastAt: typeof parsed.lastAt === "number" && parsed.lastAt > 0 ? parsed.lastAt : 0,
      dismissed: parsed.dismissed === true,
    };
  } catch {
    return initialProactiveState;
  }
}

export function canOfferProactive(
  state: ProactiveState,
  now: number,
  options: { maxInteractions?: number; cooldownMs?: number } = {},
): boolean {
  const maxInteractions = options.maxInteractions ?? 1;
  const cooldownMs = options.cooldownMs ?? 30 * 60 * 1000;
  return (
    !state.dismissed &&
    state.count < maxInteractions &&
    (state.lastAt === 0 || now - state.lastAt >= cooldownMs)
  );
}

export function markProactiveShown(state: ProactiveState, now: number): ProactiveState {
  return { ...state, count: state.count + 1, lastAt: now };
}

export function dismissProactive(state: ProactiveState): ProactiveState {
  return { ...state, dismissed: true };
}
