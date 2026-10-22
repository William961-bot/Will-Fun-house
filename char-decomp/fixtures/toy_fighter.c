// toy_fighter: a tiny native "fighting game" used to test chardecomp end to end.
//
// It is built stripped, so the tool sees only what it would see in a real game. The test suite builds
// a second, unstripped copy and uses its symbols as ground truth: every finding has to land on the
// function or struct field this source says it should.
//
// usage: toy_fighter <assets_dir> <script> [frames] [far]
//   script: idle | jab | heavy | sweep | walk   (player 1 repeats that action)
//   far:    put player 2 out of reach, so attacks whiff
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define NOINLINE __attribute__((noinline))

typedef struct {
    float x, y, w, h;   // 0x00
    int32_t active;     // 0x10
    int32_t damage;     // 0x14
} Hitbox;

// A separate component reached through a pointer, like the animation state of an engine character.
typedef struct {
    int32_t clip;   // 0x0 mirrors the fighter's state
    int32_t frame;  // 0x4 frames since the clip started
    float rate;     // 0x8 playback rate
} Anim;

typedef struct Fighter {
    uint32_t tag;        // 0x00 'FGHT'
    int32_t hp;          // 0x04
    float x, y;          // 0x08 0x0c
    float vx, vy;        // 0x10 0x14
    int32_t state;       // 0x18 0 idle, 1 attack, 2 hitstun, 3 walk
    int32_t state_frame; // 0x1c
    int32_t move_id;     // 0x20
    int32_t facing;      // 0x24
    Hitbox hitbox;       // 0x28
    int32_t meter;       // 0x40
    char name[16];       // 0x44
    uint8_t *sprite;     // 0x58
    size_t sprite_size;  // 0x60
    Anim *anim;          // 0x68
} Fighter;

typedef struct {
    const char *name;
    int32_t startup, active, recovery, damage;
    float reach;
} Move;

static const Move MOVES[] = {
    {"jab", 4, 2, 7, 30, 40.0f},
    {"heavy", 13, 4, 21, 95, 70.0f},
    {"sweep", 9, 3, 16, 60, 55.0f},
};

enum { ST_IDLE, ST_ATTACK, ST_HITSTUN, ST_WALK };

Fighter *g_fighters[2];

NOINLINE static size_t read_file(const char *path, uint8_t **out) {
    FILE *f = fopen(path, "rb");
    if (!f) return 0;
    fseek(f, 0, SEEK_END);
    long n = ftell(f);
    fseek(f, 0, SEEK_SET);
    *out = malloc(n > 0 ? (size_t)n : 1);
    size_t got = fread(*out, 1, (size_t)n, f);
    fclose(f);
    return got;
}

NOINLINE static Fighter *load_character(const char *assets, const char *name, int32_t hp, float x, int facing) {
    char path[512];
    Fighter *f = calloc(1, sizeof(Fighter));
    f->tag = 0x54484746;
    f->hp = hp;
    f->x = x;
    f->facing = facing;
    strncpy(f->name, name, sizeof(f->name) - 1);
    snprintf(path, sizeof path, "%s/%s/sprite.bin", assets, name);
    f->sprite_size = read_file(path, &f->sprite);
    uint8_t *model = NULL;  // the character's skinned mesh (TFMD format, see chardecomp/assets/toyfmt.py)
    snprintf(path, sizeof path, "%s/%s/model.tfmd", assets, name);
    read_file(path, &model);
    free(model);
    f->anim = calloc(1, sizeof(Anim));
    f->anim->rate = 1.0f;
    uint8_t *voice = NULL;
    snprintf(path, sizeof path, "%s/%s/voice.wav", assets, name);
    read_file(path, &voice);
    free(voice);
    return f;
}

NOINLINE static void start_move(Fighter *f, int32_t id) {
    if (f->state != ST_IDLE && f->state != ST_WALK) return;
    f->state = ST_ATTACK;
    f->state_frame = 0;
    f->move_id = id;
    f->vx = 0;
}

NOINLINE static void update_move(Fighter *f) {
    const Move *m = &MOVES[f->move_id];
    f->state_frame++;
    if (f->state_frame <= m->startup) {
        f->hitbox.active = 0;
    } else if (f->state_frame <= m->startup + m->active) {
        f->hitbox.active = 1;
        f->hitbox.damage = m->damage;
        f->hitbox.x = f->x + f->facing * m->reach * 0.5f;
        f->hitbox.w = m->reach;
        f->hitbox.y = 0;
        f->hitbox.h = 20;
    } else if (f->state_frame < m->startup + m->active + m->recovery) {
        f->hitbox.active = 0;
    } else {
        f->hitbox.active = 0;
        f->state = ST_IDLE;
        f->state_frame = 0;
    }
}

NOINLINE static void update_hitstun(Fighter *f) {
    if (++f->state_frame >= 18) {
        f->state = ST_IDLE;
        f->state_frame = 0;
    }
}

NOINLINE static void walk(Fighter *f, float dir) {
    if (f->state == ST_IDLE) f->state = ST_WALK;
    if (f->state == ST_WALK) f->vx = 2.5f * dir;
}

NOINLINE static void apply_physics(Fighter *f) {
    f->x += f->vx;
    f->y += f->vy;
    f->vx *= 0.8f;
    if (f->state == ST_WALK && f->vx < 0.05f && f->vx > -0.05f) f->state = ST_IDLE;
}

NOINLINE static void check_hit(Fighter *a, Fighter *d) {
    if (!a->hitbox.active || d->state == ST_HITSTUN) return;
    float dist = d->x - a->x;
    if (dist < 0) dist = -dist;
    if (dist > a->hitbox.w) return;
    d->hp -= a->hitbox.damage;
    d->state = ST_HITSTUN;
    d->state_frame = 0;
    a->meter += a->hitbox.damage / 5;
    a->hitbox.active = 0;
}

NOINLINE static void game_tick(Fighter *p1, Fighter *p2, int cmd) {
    if (cmd >= 0 && cmd < 3) start_move(p1, cmd);
    if (cmd == 3) walk(p1, 1.0f);
    for (int i = 0; i < 2; i++) {
        Fighter *f = i ? p2 : p1;
        if (f->state == ST_ATTACK) update_move(f);
        else if (f->state == ST_HITSTUN) update_hitstun(f);
        apply_physics(f);
        if (f->anim->clip != f->state) {
            f->anim->clip = f->state;
            f->anim->frame = 0;
        } else {
            f->anim->frame++;
        }
    }
    check_hit(p1, p2);
}

int main(int argc, char **argv) {
    if (argc < 3) {
        fprintf(stderr, "usage: %s <assets_dir> <idle|jab|heavy|sweep|walk> [frames] [far]\n", argv[0]);
        return 2;
    }
    const char *script = argv[2];
    int frames = argc > 3 ? atoi(argv[3]) : 240;
    int action = -1;
    if (!strcmp(script, "jab")) action = 0;
    else if (!strcmp(script, "heavy")) action = 1;
    else if (!strcmp(script, "sweep")) action = 2;
    else if (!strcmp(script, "walk")) action = 3;

    g_fighters[0] = load_character(argv[1], "ryo", 1337, 0.0f, 1);
    float p2x = argc > 4 && !strcmp(argv[4], "far") ? 500.0f : 50.0f;
    g_fighters[1] = load_character(argv[1], "ken", 1000, p2x, -1);
    if (getenv("TOY_DEBUG")) fprintf(stderr, "P1 %p\n", (void *)g_fighters[0]);

    for (int frame = 0; frame < frames; frame++) {
        int cmd = -1;
        if (action == 3) cmd = 3;
        else if (action >= 0 && frame % 60 == 10) cmd = action;
        game_tick(g_fighters[0], g_fighters[1], cmd);
        usleep(4000);
    }
    // Stay alive like a game sitting in a menu, so a tracer can detach cleanly.
    for (int i = 0; i < 600; i++) usleep(100000);
    return 0;
}
