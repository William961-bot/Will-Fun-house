// toy_fighter: a tiny native "fighting game" used to test chardecomp end to end.
//
// It is built stripped, so the tool sees only what it would see in a real game. The test suite builds
// a second, unstripped copy and uses its symbols as ground truth: every finding has to land on the
// function or struct field this source says it should.
//
// usage: toy_fighter <assets_dir> <script> [frames] [far | DISTANCE]
//   script: idle | jab | heavy | sweep | walk | jump   (player 1 repeats that action)
//           walk: walk for 30 frames, stop for 30; jump: jump every 60 frames
//   far:    put player 2 out of reach (500 units), so attacks whiff; a number puts player 2 that far away
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
#define BONES 5
typedef struct {
    int32_t clip;            // 0x0 mirrors the fighter's state
    int32_t frame;           // 0x4 frames since the clip started
    float rate;              // 0x8 playback rate
    float pose[BONES][4];    // 0xc evaluated bone rotations (x, y, z, w), written every frame
} Anim;

// Animation clips loaded from <name>/model.tfan (format in chardecomp/assets/toyfmt.py).
typedef struct {
    int16_t key_count;
    int16_t loop;
    int16_t key_frame[8];
    float key_rot[8][BONES][4];
} Clip;

static Clip g_clips[2][4];   // per fighter, per state
static int g_clip_count[2];

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

enum { ST_IDLE, ST_ATTACK, ST_HITSTUN, ST_WALK, ST_AIR };

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

NOINLINE static void load_clips(const char *assets, const char *name, int who) {
    char path[512];
    uint8_t *data = NULL;
    snprintf(path, sizeof path, "%s/%s/model.tfan", assets, name);
    size_t n = read_file(path, &data);
    g_clip_count[who] = 0;
    if (n < 12 || memcmp(data, "TFAN", 4) != 0) { free(data); return; }
    const uint8_t *p = data + 8;
    uint16_t clips, bones;
    memcpy(&clips, p, 2); memcpy(&bones, p + 2, 2); p += 8;  // + f32 sample rate
    for (int c = 0; c < clips && c < 4 && bones == BONES; c++) {
        Clip *cl = &g_clips[who][c];
        p += 16;  // name
        uint16_t keys, loop, notifies;
        memcpy(&keys, p, 2); memcpy(&loop, p + 2, 2); memcpy(&notifies, p + 4, 2); p += 6;
        cl->key_count = keys > 8 ? 8 : keys;
        cl->loop = loop;
        for (int k = 0; k < keys; k++) {
            uint16_t fr;
            memcpy(&fr, p, 2); p += 2;
            if (k < 8) { cl->key_frame[k] = fr; memcpy(cl->key_rot[k], p, sizeof(float) * BONES * 4); }
            p += sizeof(float) * BONES * 4;
        }
        p += notifies * 18;  // u16 frame + char[16] name: gameplay events, not used for posing
        g_clip_count[who] = c + 1;
    }
    free(data);
}

// Normalised linear interpolation between the two keys around `frame` (looping clips wrap).
NOINLINE static void evaluate_pose(Anim *a, int who) {
    if (a->clip < 0 || a->clip >= g_clip_count[who]) return;
    const Clip *c = &g_clips[who][a->clip];
    if (c->key_count == 0) return;
    int last = c->key_frame[c->key_count - 1];
    int f = a->frame;
    if (c->loop && last > 0) f %= last;
    if (f >= last) f = last;
    int k = 0;
    while (k + 1 < c->key_count && c->key_frame[k + 1] <= f) k++;
    int k1 = k + 1 < c->key_count ? k + 1 : k;
    float t = k1 == k ? 0.0f : (float)(f - c->key_frame[k]) / (float)(c->key_frame[k1] - c->key_frame[k]);
    for (int b = 0; b < BONES; b++) {
        float q[4], len = 0.0f;
        for (int i = 0; i < 4; i++) {
            q[i] = c->key_rot[k][b][i] * (1.0f - t) + c->key_rot[k1][b][i] * t;
            len += q[i] * q[i];
        }
        // sqrt by Newton iterations (keeps the toy free of libm); len is in [0.5, 1] for unit keys
        float r = 1.0f;
        for (int it = 0; it < 6; it++) r = 0.5f * (r + len / r);
        len = r > 0.0f ? 1.0f / r : 1.0f;
        for (int i = 0; i < 4; i++) a->pose[b][i] = q[i] * len;
    }
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

NOINLINE static void jump(Fighter *f) {
    if (f->state != ST_IDLE && f->state != ST_WALK) return;
    f->state = ST_AIR;
    f->state_frame = 0;
    f->vy = 6.0f;
}

NOINLINE static void apply_physics(Fighter *f) {
    f->x += f->vx;
    f->y += f->vy;
    f->vx *= 0.8f;
    if (f->y > 0.0f || f->vy > 0.0f) f->vy -= 0.5f;  // gravity only while airborne
    if (f->state == ST_AIR && f->y <= 0.0f) {         // landing
        f->y = 0.0f;
        f->vy = 0.0f;
        f->state = ST_IDLE;
    }
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
    if (cmd == 4) jump(p1);
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
        evaluate_pose(f->anim, i);
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
    else if (!strcmp(script, "jump")) action = 4;

    g_fighters[0] = load_character(argv[1], "ryo", 1337, 0.0f, 1);
    load_clips(argv[1], "ryo", 0);
    float p2x = 50.0f;
    if (argc > 4) p2x = !strcmp(argv[4], "far") ? 500.0f : (float)atof(argv[4]);
    g_fighters[1] = load_character(argv[1], "ken", 1000, p2x, -1);
    load_clips(argv[1], "ken", 1);
    if (getenv("TOY_DEBUG")) fprintf(stderr, "P1 %p\n", (void *)g_fighters[0]);

    for (int frame = 0; frame < frames; frame++) {
        int cmd = -1;
        if (action == 3) cmd = frame % 60 < 30 ? 3 : -1;
        else if (action >= 0 && frame % 60 == 10) cmd = action;
        game_tick(g_fighters[0], g_fighters[1], cmd);
        usleep(4000);
    }
    // Stay alive like a game sitting in a menu, so a tracer can detach cleanly.
    for (int i = 0; i < 600; i++) usleep(100000);
    return 0;
}
