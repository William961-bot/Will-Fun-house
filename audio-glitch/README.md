# Audio Manipulation / Glitch Tool

Load and manipulate audio files with glitch effects.

## Goal

Work with raw audio samples and apply effects like reverse, stutter, bitcrush.

## Techniques

- Reverse playback
- Stutter / repeat sections
- Volume envelope
- Bitcrush / sample rate reduction
- Time stretching (basic)

## Dependencies

- **dr_wav.h** (single-header WAV library)
  - Download from: https://github.com/mackron/dr_libs

## Next Steps

1. Load WAV file and access samples
2. Reverse the audio buffer
3. Add stutter effect (repeat chunks)
4. Experiment with bitcrushing
5. Save modified audio

## Compile

```
g++ main.cpp -o audioglitch
```
