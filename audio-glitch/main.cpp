// Audio Glitch - Manipulate WAV audio files

// #define DR_WAV_IMPLEMENTATION
// #include "dr_wav.h"  // Uncomment when you have dr_wav.h

#include <iostream>
#include <vector>
#include <algorithm>
#include <cstdlib>

// Placeholder: reverse audio buffer
void reverseAudio(std::vector<float>& samples) {
    // TODO: reverse the order of samples
}

// Placeholder: stutter effect - repeat small chunks
void stutterEffect(std::vector<float>& samples, int chunkSize, int repeats) {
    // TODO: find chunks of size chunkSize
    // TODO: repeat each chunk 'repeats' times
}

// Placeholder: change volume
void adjustVolume(std::vector<float>& samples, float gain) {
    // TODO: multiply each sample by gain
    // TODO: clamp to [-1.0, 1.0]
}

// Placeholder: bitcrush effect (reduce bit depth)
void bitcrush(std::vector<float>& samples, int bits) {
    // TODO: quantize samples to fewer bits
}

// Placeholder: downsample (reduce sample rate)
void downsample(std::vector<float>& samples, int factor) {
    // TODO: keep every Nth sample, discard the rest
}

int main(int argc, char* argv[]) {
    // TODO: load WAV file with dr_wav
    // TODO: apply effects (reverse, stutter, bitcrush, downsample)
    // TODO: save output with dr_wav

    // placeholder: generate test sine wave
    int sampleRate = 44100;
    int duration = 2;
    std::vector<float> samples(sampleRate * duration);

    for (int i = 0; i < samples.size(); i++) {
        float t = (float)i / sampleRate;
        samples[i] = 0.5f * std::sin(2.0f * 3.14159f * 440.0f * t);
    }

    // TODO: call your effects here
    // reverseAudio(samples);
    // adjustVolume(samples, 1.5f);

    return 0;
}
