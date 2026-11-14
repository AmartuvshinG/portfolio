# Cinematic portfolio handoff — 2026-11-14

The approved architectural redesign is implemented as a local draft. The next
step is visual review with Amara, followed by refinements to this draft.
Production promotion has not been requested.

## Preview and scope

- Start with `npm run dev:no-open`.
- Redesign: <http://127.0.0.1:3000/?draft=cinematic&lang=en>.
- Original: <http://127.0.0.1:3000/?draft=off&lang=en>.
- Use `lang=mn` for Mongolian. New draft interface translations await proofreading.
- The draft gate permits only `localhost` and `127.0.0.1`. Development defaults
  to cinematic; production server rendering defaults to original. A commit or
  deployment alone does **not** promote this design to public visitors.
- Keep the original comparison until review. Earlier carousel and loader
  experiments remain behind the existing local query modes.

## Direction and implementation

Amara chose an architectural hybrid inspired by Active Theory and the ASUS ROG
Matrix RTX 5090 presentation: a personal Mongolian ᠠ in a dark metallic chamber,
with structural depth, a floor reflection, and crimson → magenta → violet light.
Keep the original Ink opening, heavy type, diagonal hero chapter menu, project
stage with fanned selector, sourced case files, and real-photo Journey.

The implementation lives in `src/components/cinematic/`. `worldPoses.ts` defines
chapter camera poses; `src/lib/cinematicWorld.ts` carries typed scene updates.
The single Three.js renderer batches structural elements and light strips, caps
scene rendering at 60Hz, ignores reading-stage progress when the pose is fixed,
and sleeps after settling, behind opaque overlays, and in hidden tabs. Its
drawing buffers are capped at 1.1 million desktop / 450,000 phone pixels.
Low-power, reduced-motion, and unavailable-WebGL paths use the chamber SVG.

Hero pins only at ≥1024×900 and uses a 175svh runway. Work pins at ≥1100×820;
Journey requires ≥1100×900 to fit the longer Mongolian cards and controls. Its
ten entries use a 388svh runway with endpoint holds. Short screens and reduced
motion flow. Preserve stable outer section nodes and `.cin-name` flex-shrink:0.

Cinematic chapter seams are fine rules; the original comparison retains its
previous effects. The spine's fill and handle remain one moving box. Fine-pointer
chapter buttons are keyboard accessible; closely spaced targets use lateral
connectors to retain their true scroll positions without overlapping hit areas.
Coarse pointers retain a noninteractive indicator.

## Verification completed

- Typecheck, ESLint, static build, and diff checks passed.
- Full production axe sweep passed: EN/MN, desktop/phone, both motion modes.
- Chromium checked at 390/768/1440px and short desktop heights; iPhone WebKit
  checked in both motion modes, including Mongolian.
- Exercised menu jumps, project buttons/keyboard selection, case-file opening,
  Escape and focus restoration, Journey endpoint alignment, spine alignment,
  low-power mode, unavailable WebGL, and context loss/restoration.
- Actual background-pixel sampling with text hidden: worst hero headline
  contrast 5.36:1; sampled body/metadata contrast at least 10.69:1.
- Four alternating headed production runs at 1440×900, DPR 2, 4× CPU:
  cinematic p95 **33.4, 29.1, 29.1, 29.1ms**; original
  **62.6, 50.1, 50.0, 54.2ms**. Median run p95 **29.1 vs 52.15ms**.
  One cinematic run exceeded the approximately 33ms target. These are local
  comparative measurements; physical-phone performance was not measured.
- Seven scene draw calls per rendered frame; zero settled idle draws. No
  running infinite animations found at settled hero idle.
- Existing Next image-loader warnings remain; normal QA observed no runtime errors.

## Resume notes

Read the latest shared-memory `HANDOFF-LOG.md`, the cinematic direction/performance
notes, and the visual-verification skill before further UI work. Bring the tested
headed browser page forward and assert the selected project title: an unfocused
AnimatePresence exit can outlive a fixed timeout when other QA windows are open.
Run performance tests without competing browser tests.

The development preview was left serving on port 3000. The temporary production
server on port 3100 was stopped. Scratch benchmarks, contrast scripts, and a
pre-architecture source snapshot remain in the system temporary directory.

The pre-existing agent setup files (`AGENTS.md`, `CLAUDE.md`, and the shared
handoff/cross-review skills) are intentionally excluded from this design commit.
No push or deployment is authorized by this handoff.
