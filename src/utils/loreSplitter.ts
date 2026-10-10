export type SplitLore = {
  surfaceObservation: string   // what you see now
  buriedHistory: string        // what happened here
}

export function splitLore(loreFragment: string): SplitLore {
  if (!loreFragment) {
    return {
      surfaceObservation: '',
      buriedHistory: '',
    }
  }

  // Check if text is separated by double newline first
  if (loreFragment.includes('\n\n')) {
    const parts = loreFragment.split('\n\n')
    return {
      surfaceObservation: parts[0].trim(),
      buriedHistory: parts.slice(1).join('\n\n').trim(),
    }
  }

  // Split on double newline or at sentence boundary 
  // around the midpoint of the text
  const sentences = loreFragment.match(
    /[^.!?]+[.!?]+/g
  ) || [loreFragment]
  
  if (sentences.length <= 2) {
    return {
      surfaceObservation: loreFragment,
      buriedHistory: '',
    }
  }
  
  const mid = Math.ceil(sentences.length / 2)
  return {
    surfaceObservation: sentences.slice(0, mid).join(' ').trim(),
    buriedHistory: sentences.slice(mid).join(' ').trim(),
  }
}
