CONST ACTOR_COUNT = 6
CONST TICK_COUNT = 48
CONST ACTOR_PATROL = 0
CONST ACTOR_CHASE = 1
CONST ACTOR_COOLDOWN = 2

DIM actor_x(ACTOR_COUNT)
DIM actor_y(ACTOR_COUNT)
DIM actor_direction(ACTOR_COUNT)
DIM actor_timer(ACTOR_COUNT)
DIM actor_mode(ACTOR_COUNT)
DIM actor_hits(ACTOR_COUNT)

world_mode = 1
player_x = 88
player_y = 80
collision_count = 0
#score = 0
#checksum = 0
initial_x = 24
initial_y = 48
initial_direction = 0

MODE 2

FOR actor_index = 0 TO ACTOR_COUNT - 1
    actor_x(actor_index) = initial_x
    actor_y(actor_index) = initial_y
    actor_direction(actor_index) = initial_direction
    actor_timer(actor_index) = 3 + actor_index
    actor_mode(actor_index) = ACTOR_PATROL
    actor_hits(actor_index) = 0
    initial_x = initial_x + 24
    initial_y = initial_y + 8
    IF initial_direction = 0 THEN initial_direction = 1 ELSE initial_direction = 0
NEXT actor_index

FOR tick = 0 TO TICK_COUNT - 1
    ASM PUSH AF
    ASM LD A,$CA
    ASM XOR $FE
    ASM XOR $FE
    ASM CP $CA
    ASM POP AF
    IF world_mode = 1 THEN GOSUB update_actors ELSE GOSUB update_bonus
    ASM PUSH AF
    ASM LD A,$BE
    ASM XOR $EF
    ASM XOR $EF
    ASM CP $BE
    ASM POP AF
NEXT tick

FOR actor_index = 0 TO ACTOR_COUNT - 1
    #checksum = #checksum + actor_x(actor_index)
    #checksum = #checksum + actor_y(actor_index)
    #checksum = #checksum + actor_timer(actor_index)
    #checksum = #checksum + actor_mode(actor_index)
    #checksum = #checksum + actor_hits(actor_index)
NEXT actor_index
#checksum = #checksum + #score + collision_count

PRINT AT 5,3,"STATE UPDATE BENCHMARK"
PRINT AT 5,8,"DONE"
PRINT AT 5,10,"SCORE"
PRINT AT 14,10,<>#score
PRINT AT 5,12,"CHECK"
PRINT AT 14,12,<>#checksum

done:
GOTO done

update_actors:
FOR actor_index = 0 TO ACTOR_COUNT - 1
    IF actor_mode(actor_index) = ACTOR_PATROL THEN
        IF actor_direction(actor_index) = 0 THEN
            actor_x(actor_index) = actor_x(actor_index) + 1
            IF actor_x(actor_index) >= 208 THEN actor_direction(actor_index) = 1
        ELSE
            actor_x(actor_index) = actor_x(actor_index) - 1
            IF actor_x(actor_index) <= 16 THEN actor_direction(actor_index) = 0
        END IF
    ELSEIF actor_mode(actor_index) = ACTOR_CHASE THEN
        IF actor_x(actor_index) < player_x THEN
            actor_x(actor_index) = actor_x(actor_index) + 2
        ELSEIF actor_x(actor_index) > player_x THEN
            actor_x(actor_index) = actor_x(actor_index) - 2
        END IF
        IF actor_y(actor_index) < player_y THEN actor_y(actor_index) = actor_y(actor_index) + 1
        IF actor_y(actor_index) > player_y THEN actor_y(actor_index) = actor_y(actor_index) - 1
    ELSE
        IF actor_timer(actor_index) = 0 THEN
            actor_mode(actor_index) = ACTOR_PATROL
            actor_timer(actor_index) = 5 + actor_index
        END IF
    END IF

    IF actor_timer(actor_index) > 0 THEN actor_timer(actor_index) = actor_timer(actor_index) - 1
    IF actor_timer(actor_index) = 0 AND actor_mode(actor_index) = ACTOR_PATROL THEN
        actor_mode(actor_index) = ACTOR_CHASE
        actor_timer(actor_index) = 8
    ELSEIF actor_timer(actor_index) = 0 AND actor_mode(actor_index) = ACTOR_CHASE THEN
        actor_mode(actor_index) = ACTOR_COOLDOWN
        actor_timer(actor_index) = 4
    END IF

    IF actor_mode(actor_index) <> ACTOR_COOLDOWN THEN
        IF player_x < actor_x(actor_index) + 8 AND player_x + 12 > actor_x(actor_index) AND player_y < actor_y(actor_index) + 8 AND player_y + 12 > actor_y(actor_index) THEN
            actor_hits(actor_index) = actor_hits(actor_index) + 1
            collision_count = collision_count + 1
            #score = #score + 25
            actor_mode(actor_index) = ACTOR_COOLDOWN
            actor_timer(actor_index) = 6
        END IF
    END IF
NEXT actor_index

IF tick = 23 THEN world_mode = 2
RETURN

update_bonus:
#score = #score + 100
player_x = player_x + 4
world_mode = 1
RETURN
