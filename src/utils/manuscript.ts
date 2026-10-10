import { Quest } from "@/types/quest";

export function createManuscriptSegments(quest: Quest): string[] {
  const segments: string[] = [];
  
  // Segment 0: Premise
  segments.push(`PREMISE: ${quest.premise}`);

  // Segments 1..N: Each Waypoint's Lore
  quest.waypoints.forEach((wp) => {
    segments.push(`WAYPOINT ${wp.sequence} (${wp.realPlaceName}): ${wp.loreFragment}`);
  });

  // Final Segment: Resolution
  if (quest.resolution) {
    segments.push(`THE FINAL RECORD: ${quest.resolution}`);
  }

  return segments;
}
