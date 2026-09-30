// Desk-wide controls set by admins (swing_settings row "controls").
export interface Limits { defaultRisk: number; maxRisk: number; maxPositions: number }
export interface Controls extends Limits { disabled: string[] }
export const LIMITS: Limits = { defaultRisk: 1, maxRisk: 5, maxPositions: 20 };
export const DEFAULT_CONTROLS: Controls = { ...LIMITS, disabled: [] };
