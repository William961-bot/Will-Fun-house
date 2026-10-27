// Motion-capture clips: stickman poses recorded from video by tools/mocap-convert.cjs.
// Presentation only. Logic never reads them; they replace a fighter's drawn pose, never hitboxes or timing.
const MOCAP_CLIPS = {};

// The pose `ticks` (60 Hz game frames) into a looping clip, blending smoothly between recorded frames.
function mocapPose(id, ticks) {
  const clip = MOCAP_CLIPS[id];
  if (!clip) return null;
  const n = clip.frames.length, at = ((ticks * clip.fps / 60) % n + n) % n;
  const i = Math.floor(at), k = at - i, a = clip.frames[i], b = clip.frames[(i + 1) % n];
  const out = {};
  for (const joint in a) out[joint] = [a[joint][0] + (b[joint][0] - a[joint][0]) * k, a[joint][1] + (b[joint][1] - a[joint][1]) * k];
  return out;
}
