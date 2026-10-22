// pe_mini: a tiny Windows program for testing the static exporter on PE32 and PE32+ files.
// Built by the tests with zig (`python -m ziglang cc -target x86_64-windows-gnu`); never run.
// `hurt` is exported, so its address and name are ground truth in the export table.
#include <stdio.h>

typedef struct {
    int hp;   // 0x0
    float x;  // 0x4
} Fighter;

__declspec(dllexport) __declspec(noinline) void hurt(Fighter *f, int amount) {
    f->hp -= amount;
}

int main(void) {
    Fighter f = {1337, 0.0f};
    hurt(&f, 5);
    printf("%s %d\n", "fighter hp", f.hp);
    return 0;
}
