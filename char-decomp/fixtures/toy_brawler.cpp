// toy_brawler: a second, structurally different native character for Stage 10 (generalisation).
//
// Same kind of game as toy_fighter.c, built differently on purpose: C++ classes with virtual methods, the
// players held inside a heap-allocated Game object (reached through two pointers), a different field layout,
// a different tick rate (about 120 Hz), the input passed as the second argument of a member function, and
// different constants everywhere. The test suite reads the constants below as ground truth; chardecomp has to
// measure every one of them.
//
// usage: toy_brawler <script> [frames] [DISTANCE | far]
//   script: idle | upper | walk | jump | super
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <unistd.h>

#define NOINLINE __attribute__((noinline))

enum State : int32_t { IDLE, ATTACK, HITSTUN, WALK, AIR, SUPER };

static const float WALK_SPEED = 3.0f, FRICTION = 0.75f, GRAVITY = 0.4f, JUMP = 5.0f;
static const int UP_STARTUP = 6, UP_ACTIVE = 3, UP_RECOVERY = 14, UP_DAMAGE = 80;
static const float UP_REACH = 45.0f;
static const int HITSTUN_FRAMES = 22, SUPER_COST = 40, SUPER_LAUNCH = 5, SUPER_LENGTH = 20, SHOT_DAMAGE = 120;
static const float SHOT_SPEED = 6.0f, SHOT_RADIUS = 8.0f;

struct Vec2 { float x, y; };

class Entity {
public:
    virtual ~Entity() {}
    virtual void update() = 0;
    uint32_t id = 0;                 // 0x08
};

class Brawler : public Entity {
public:
    int32_t meter = 0;               // 0x0c
    Vec2 vel{0, 0};                  // 0x10 vx, 0x14 vy
    int32_t frame = 0;               // 0x18 frames in the current state
    int32_t state = IDLE;            // 0x1c
    Vec2 pos{0, 0};                  // 0x20 x, 0x24 y
    int32_t hp = 0;                  // 0x28
    int32_t hit_active = 0;          // 0x2c
    float facing = 1.0f;             // 0x30
    bool airborne = false;           // 0x34

    NOINLINE void update() override {
        frame++;
        if (state == ATTACK) {
            hit_active = frame > UP_STARTUP && frame <= UP_STARTUP + UP_ACTIVE;
            if (frame >= UP_STARTUP + UP_ACTIVE + UP_RECOVERY) { state = IDLE; frame = 0; hit_active = 0; }
        } else if (state == HITSTUN) {
            if (frame >= HITSTUN_FRAMES) { state = IDLE; frame = 0; }
        } else if (state == SUPER) {
            if (frame >= SUPER_LENGTH) { state = IDLE; frame = 0; }
        }
        pos.x += vel.x;
        pos.y += vel.y;
        vel.x *= FRICTION;
        if (pos.y > 0.0f || vel.y > 0.0f) vel.y -= GRAVITY;
        if (airborne && pos.y <= 0.0f) {
            pos.y = 0.0f;
            vel.y = 0.0f;
            airborne = false;
            state = IDLE;
            frame = 0;
        }
    }
};

struct Shot {
    float x = 0;                     // 0x00
    float vx = 0;                    // 0x04
    int32_t active = 0;              // 0x08
    int32_t damage = 0;              // 0x0c
};

class Game {
public:
    virtual ~Game() {}
    Brawler *players[2] = {nullptr, nullptr};   // 0x08, 0x10
    Shot *shot = nullptr;                       // 0x18
    int32_t held = 0;

    NOINLINE void tick(int cmd);
};

NOINLINE void Game::tick(int cmd) {
    Brawler *p = players[0], *d = players[1];
    bool can_act = p->state == IDLE || p->state == WALK;
    if (cmd == 1 && can_act) { p->state = ATTACK; p->frame = 0; }
    if (cmd == 3) {
        if (p->state == IDLE) { p->state = WALK; p->frame = 0; }
        if (p->state == WALK) p->vel.x = WALK_SPEED * p->facing;
    } else if (p->state == WALK) {
        p->state = IDLE;             // walking stops as soon as the input is released
        p->frame = 0;
    }
    if (cmd == 4 && can_act) { p->state = AIR; p->frame = 0; p->vel.y = JUMP; p->airborne = true; }
    if (cmd == 5 && can_act && p->meter >= SUPER_COST) { p->meter -= SUPER_COST; p->state = SUPER; p->frame = 0; }
    for (Brawler *b : players) b->update();
    if (p->state == SUPER && p->frame == SUPER_LAUNCH) {
        shot->x = p->pos.x;
        shot->vx = SHOT_SPEED * p->facing;
        shot->active = 1;
        shot->damage = SHOT_DAMAGE;
    }
    if (p->hit_active && p->frame == UP_STARTUP + 1 && d->state != HITSTUN && std::fabs(d->pos.x - p->pos.x) <= UP_REACH) {
        d->hp -= UP_DAMAGE;          // the hitbox stays on after a hit (unlike toy_fighter)
        d->state = HITSTUN;
        d->frame = 0;
        p->meter += UP_DAMAGE / 4;
    }
    if (shot->active) {
        shot->x += shot->vx;
        if (std::fabs(d->pos.x - shot->x) <= SHOT_RADIUS && d->state != HITSTUN) {
            d->hp -= shot->damage;
            d->state = HITSTUN;
            d->frame = 0;
            shot->active = 0;
        }
    }
}

Game *g_game;

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "usage: %s <idle|upper|walk|jump|super> [frames] [DISTANCE|far]\n", argv[0]);
        return 2;
    }
    const char *script = argv[1];
    int frames = argc > 2 ? atoi(argv[2]) : 300;
    float dist = 40.0f;
    if (argc > 3) dist = !strcmp(argv[3], "far") ? 600.0f : (float)atof(argv[3]);
    g_game = new Game();
    for (int i = 0; i < 2; i++) {
        Brawler *b = new Brawler();
        b->id = 0xB0 + i;
        b->hp = i ? 900 : 1100;
        b->pos.x = i ? dist : 0.0f;
        b->facing = i ? -1.0f : 1.0f;
        g_game->players[i] = b;
    }
    g_game->shot = new Shot();
    for (int f = 0; f < frames; f++) {
        int cmd = -1, m = f % 60;
        if (!strcmp(script, "upper") && m == 10) cmd = 1;
        else if (!strcmp(script, "walk") && m < 30) cmd = 3;
        else if (!strcmp(script, "jump") && m == 10) cmd = 4;
        else if (!strcmp(script, "super")) cmd = m == 10 ? 1 : m == 50 ? 5 : -1;
        g_game->tick(cmd);
        usleep(8000);
    }
    for (int i = 0; i < 600; i++) usleep(100000);
    return 0;
}
