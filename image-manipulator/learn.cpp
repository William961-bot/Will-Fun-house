// learn.cpp - Effects library (no main, no stb headers)
// Compile this into your own test runner, or include it in main_simple.cpp

#include <vector>
#include <string>
#include <cmath>
#include <cstdlib>

// One RGB pixel
struct Pixel {
    unsigned char r, g, b;
     
};

// Keeps values between low and high
int clamp(int low, int high, int v) {
    if (v < low) return low;   // too small -> cap at low
    if (v > high) return high; // too large -> cap at high
    return v;                  // good value, leave it
}

// ===== EFFECTS =====

void applyGrayscale(std::vector<Pixel>& p) {
    // average all 3 channels so every pixel becomes gray
    for (int i = 0; i < p.size(); i++) {
        int avg = (p[i].r + p[i].g + p[i].b) / 3; // sum channels, divide by 3
        p[i].r = avg; // set red to average
        p[i].g = avg; // set green to average
        p[i].b = avg; // set blue to average
    }
}

void applyInvert(std::vector<Pixel>& p) {
    // flip each color: 255 becomes 0, 0 becomes 255
    for (int i = 0; i < p.size(); i++) {
        p[i].r = 255 - p[i].r; // subtract red from 255
        p[i].g = 255 - p[i].g; // subtract green from 255
        p[i].b = 255 - p[i].b; // subtract blue from 255
    }
}

void applyBrightness(std::vector<Pixel>& p, int amt) {
    // add amt to each channel, use clamp() to stay in range
    for (int i = 0; i < p.size(); i++) {
        p[i].r = clamp(p[i].r + amt, 0, 255); // brighten red channel
        p[i].g = clamp(p[i].g + amt, 0, 255); // brighten green channel
        p[i].b = clamp(p[i].b + amt, 0, 255); // brighten blue channel
    }
}

void applyContrast(std::vector<Pixel>& p, int amt) {
    // scale values away from middle gray (128)
    for (int i = 0; i < p.size(); i++) {
        p[i].r = clamp((p[i].r - 128) * 2 + 128, 0, 255);
        p[i].g = clamp((p[i].g - 128) * 2 + 128, 0, 255);
        p[i].b = clamp((p[i].b - 128) * 2 + 128, 0, 255);
    }
}

//void applyThreshold(std::vector<Pixel>& p, int t) {
    // convert to pure black/white based on cutoff t


void applyChannelShift(std::vector<Pixel>& p, int w, int h,
                       int rShift, int gShift, int bShift) {
    // make a blank output array same size as the image
    std::vector<Pixel> out(p.size());

    // visit every pixel in the image
    for (int i = 0; i < p.size(); i++) {
        // turn flat index i into x (column) and y (row)
        int x = i % w;
        int y = i / w;

        // where to read each color from (shifted left/right)
        int rx = x + rShift;
        int gx = x + gShift;
        int bx = x + bShift;

        // write one new pixel into out:
        // red   from shifted position rx   (0 if out of bounds)
        // green from shifted position gx   (0 if out of bounds)
        // blue  from shifted position bx   (0 if out of bounds)
        out[i] = {
            (rx >= 0 && rx < w) ? p[y*w+rx].r : (unsigned char)0,
            (gx >= 0 && gx < w) ? p[y*w+gx].g : (unsigned char)0,
            (bx >= 0 && bx < w) ? p[y*w+bx].b : (unsigned char)0
        };
    }

    // replace original image with the shifted result
    p = out;
}

void applyNoise(std::vector<Pixel>& p, int amount) {
    // visit every pixel
    for (int i = 0; i < p.size(); i++) {
        // roll 0–99, if below amount this pixel gets noise
        if (rand() % 100 < amount) {
            // set all 3 channels to random 0–255 values
            p[i].r = rand() % 256;
            p[i].g = rand() % 256;
            p[i].b = rand() % 256;
        }
    }
}

void applyFlip(std::vector<Pixel>& p, int w, int h, const std::string& opt) {
    // mirror image if opt contains 'h' (horizontal) or 'v' (vertical)

    // temporary output array to avoid overwriting pixels while reading
    std::vector<Pixel> out(p.size());

    if (opt == "h") {
        // visit every pixel
        for (int i = 0; i < p.size(); i++) {
            // turn flat index i into x (column) and y (row)
            int x = i % w;
            int y = i / w;
            // mirror the column: 0 becomes w-1, w-1 becomes 0
            int mx = w - 1 - x;
            // copy pixel from mirrored position into output
            out[i] = p[y * w + mx];
        }
    }

    if (opt == "v") {
        // visit every pixel
        for (int i = 0; i < p.size(); i++) {
            // turn flat index i into x (column) and y (row)
            int x = i % w;
            int y = i / w;
            // mirror the row: 0 becomes h-1, h-1 becomes 0
            int my = h - 1 - y;
            // copy pixel from mirrored position into output
            out[i] = p[my * w + x];
        }
    }

    // replace original image with the flipped result
    p = out;
}

void applyBlur(std::vector<Pixel>& p, int w, int h, int r) {
    // TODO: make temp output buffer same size as p
    std::vector<Pixel> out(p.size());

    // TODO: visit every pixel in the image
 for 







    // need x and y for each pixel; use either flat i with 
    //i%w / i/w, or nested x/y loops

    // TODO: for each pixel, sum pixels in a box around it
    // box spans from x-r to x+r and y-r to y+r

    // TODO: clamp neighbor coordinates back into the image
    // min allowed is 0, max allowed is w-1 for x and h-1 for y

    // TODO: divide sums by number of box pixels, clamp each channel to 0..255, write into out

    // TODO: copy out back into p
}

void applySepia(std::vector<Pixel>& p) {
    // TODO: convert RGB to sepia/brown tones using weighted sums
    // TODO: keep each channel in 0..255 with clamp()
}

void applyVignette(std::vector<Pixel>& p, int w, int h, int strength) {
    // TODO: compute distance from center for each pixel
    // TODO: darken edges more than center using strength, clamp() each channel
}

void applyGlitch(std::vector<Pixel>& p, int w, int h, int amount) {
    // TODO: pick random horizontal rows or columns
    // TODO: shift whole slices left or right by a small random offset
    // use original p for reads and out[] for writes
}

void applySharpen(std::vector<Pixel>& p, int w, int h) {
    // TODO: look at center pixel and its neighbors
    // TODO: boost difference between center and edges for edge enhancement
    // TODO: store result in out[], then p = out;
}
