// Shared mutable session and view state for the demo.
export const state = {
  currentSessionId: null,
  /** Basename including extension of the opened acquisition (for Save PNG names). */
  loadedSourceName: null,
  activeViews: [],
  /** Per-group display slots when Composite is on (independent source vs reference). */
  compositeSlots: {source: null, reference: null},
};
