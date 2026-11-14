import type { WorldChapter } from "@/lib/cinematicWorld";

/** Camera positions, subject rotation, and exposure of the shared chamber. */
export interface WorldPose { x: number; y: number; z: number; angle: number; opacity: number }
export const WORLD_POSES: Record<WorldChapter, WorldPose> = {
  hero: { x: -1.8, y: 1.3, z: 19.5, angle: -.4, opacity: 1 },
  about: { x: -3, y: 2.4, z: 16, angle: .15, opacity: .34 },
  connect: { x: 3.5, y: 1.5, z: 24, angle: .3, opacity: .27 },
  work: { x: -4, y: 1.8, z: 23, angle: -.25, opacity: .35 },
  capabilities: { x: 4, y: 2.4, z: 26, angle: .35, opacity: .25 },
  anatomy: { x: -3, y: 3.5, z: 21, angle: -.2, opacity: .22 },
  timeline: { x: 3, y: 2, z: 25, angle: .25, opacity: .28 },
  contact: { x: -2, y: 1.4, z: 22, angle: -.4, opacity: .62 },
};
