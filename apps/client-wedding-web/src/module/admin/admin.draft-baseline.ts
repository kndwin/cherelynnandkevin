// Keep the revision attached to the snapshot a draft was actually edited from.
export function reconcileDraft<D>(draft: D | undefined, baseline: D | undefined, fresh: D, dirty: (a: D, b: D) => boolean): D {
  return draft !== undefined && baseline !== undefined && dirty(draft, baseline) ? draft : fresh;
}
