import type { OnComboPlayedHook } from './types.js';

/** Playing a bomb toggles the ranking direction; two bombs in a round cancel out. */
export const revolutionHook: OnComboPlayedHook = (ctx) => {
  if (!ctx.config.houseRules.revolution) return;
  if (ctx.combo.kind === 'bomb') {
    ctx.state.revolutionActive = !ctx.state.revolutionActive;
  }
};
