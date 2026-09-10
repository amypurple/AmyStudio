#define ACTOR_COUNT 6
#define TICK_COUNT 48
#define ACTOR_PATROL 0
#define ACTOR_CHASE 1
#define ACTOR_COOLDOWN 2

typedef struct {
    unsigned char x, y, direction, timer, mode, hits;
} ActorState;

ActorState actors[ACTOR_COUNT];
volatile unsigned char world_mode;
volatile unsigned char collision_count;
volatile unsigned int score;
volatile unsigned int checksum;
static unsigned char player_x;
static unsigned char player_y;
static unsigned char tick;

static void update_actors(void)
{
    unsigned char index;
    for (index = 0; index < ACTOR_COUNT; ++index) {
        ActorState *actor = &actors[index];
        if (actor->mode == ACTOR_PATROL) {
            if (actor->direction == 0) {
                ++actor->x;
                if (actor->x >= 208) actor->direction = 1;
            } else {
                --actor->x;
                if (actor->x <= 16) actor->direction = 0;
            }
        } else if (actor->mode == ACTOR_CHASE) {
            if (actor->x < player_x) actor->x += 2;
            else if (actor->x > player_x) actor->x -= 2;
            if (actor->y < player_y) ++actor->y;
            if (actor->y > player_y) --actor->y;
        } else if (actor->timer == 0) {
            actor->mode = ACTOR_PATROL;
            actor->timer = 5 + index;
        }
        if (actor->timer > 0) --actor->timer;
        if (actor->timer == 0 && actor->mode == ACTOR_PATROL) {
            actor->mode = ACTOR_CHASE;
            actor->timer = 8;
        } else if (actor->timer == 0 && actor->mode == ACTOR_CHASE) {
            actor->mode = ACTOR_COOLDOWN;
            actor->timer = 4;
        }
        if (actor->mode != ACTOR_COOLDOWN &&
            player_x < actor->x + 8 && actor->x < player_x + 12 &&
            player_y < actor->y + 8 && actor->y < player_y + 12) {
            ++actor->hits;
            ++collision_count;
            score += 25;
            actor->mode = ACTOR_COOLDOWN;
            actor->timer = 6;
        }
    }
    if (tick == 23) world_mode = 2;
}

static void update_bonus(void)
{
    score += 100;
    player_x += 4;
    world_mode = 1;
}

static void run_state_update_benchmark(void)
{
    unsigned char index, initial_x = 24, initial_y = 48, initial_direction = 0;
    world_mode = 1;
    collision_count = 0;
    score = 0;
    checksum = 0;
    player_x = 88;
    player_y = 80;
    for (index = 0; index < ACTOR_COUNT; ++index) {
        ActorState *actor = &actors[index];
        actor->x = initial_x;
        actor->y = initial_y;
        actor->direction = initial_direction;
        actor->timer = 3 + index;
        actor->mode = ACTOR_PATROL;
        actor->hits = 0;
        initial_x += 24;
        initial_y += 8;
        initial_direction ^= 1;
    }
    for (tick = 0; tick < TICK_COUNT; ++tick) {
        __asm
            push af
            ld a,#0xca
            xor #0xfe
            xor #0xfe
            cp #0xca
            pop af
        __endasm;
        if (world_mode == 1) update_actors(); else update_bonus();
        __asm
            push af
            ld a,#0xbe
            xor #0xef
            xor #0xef
            cp #0xbe
            pop af
        __endasm;
    }
    for (index = 0; index < ACTOR_COUNT; ++index) {
        checksum += actors[index].x + actors[index].y + actors[index].timer;
        checksum += actors[index].mode + actors[index].hits;
    }
    checksum += score + collision_count;
}
