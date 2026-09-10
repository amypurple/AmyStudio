TYPE stateType
    x AS BYTE
    y AS BYTE
    direction AS BYTE
    timer AS BYTE
    mode AS BYTE
    hits AS BYTE
END TYPE

DIM units(6) AS stateType
DIM worldMode AS BYTE
DIM playerX AS BYTE
DIM playerY AS BYTE
DIM tick AS BYTE
DIM actorIndex AS BYTE
DIM collisionCount AS BYTE
DIM score AS WORD
DIM checksum AS WORD
DIM initialX AS BYTE
DIM initialY AS BYTE
DIM initialDirection AS BYTE

GLOBAL units, worldMode, playerX, playerY, tick, actorIndex, collisionCount, score, checksum

PROCEDURE updateActors
    FOR actorIndex = 0 TO 5
        IF units(actorIndex).mode = 0 THEN
            IF units(actorIndex).direction = 0 THEN
                INC units(actorIndex).x
                IF units(actorIndex).x >= 208 THEN units(actorIndex).direction = 1
            ELSE
                DEC units(actorIndex).x
                IF units(actorIndex).x <= 16 THEN units(actorIndex).direction = 0
            ENDIF
        ELSEIF units(actorIndex).mode = 1 THEN
            IF units(actorIndex).x < playerX THEN
                ADD units(actorIndex).x, 2
            ELSEIF units(actorIndex).x > playerX THEN
                units(actorIndex).x = units(actorIndex).x - 2
            ENDIF
            IF units(actorIndex).y < playerY THEN INC units(actorIndex).y
            IF units(actorIndex).y > playerY THEN DEC units(actorIndex).y
        ELSEIF units(actorIndex).timer = 0 THEN
            units(actorIndex).mode = 0
            units(actorIndex).timer = 5 + actorIndex
        ENDIF

        IF units(actorIndex).timer > 0 THEN DEC units(actorIndex).timer
        IF units(actorIndex).timer = 0 AND units(actorIndex).mode = 0 THEN
            units(actorIndex).mode = 1
            units(actorIndex).timer = 8
        ELSEIF units(actorIndex).timer = 0 AND units(actorIndex).mode = 1 THEN
            units(actorIndex).mode = 2
            units(actorIndex).timer = 4
        ENDIF

        IF units(actorIndex).mode <> 2 THEN
            IF playerX < units(actorIndex).x + 8 AND units(actorIndex).x < playerX + 12 AND playerY < units(actorIndex).y + 8 AND units(actorIndex).y < playerY + 12 THEN
                INC units(actorIndex).hits
                INC collisionCount
                ADD score, 25
                units(actorIndex).mode = 2
                units(actorIndex).timer = 6
            ENDIF
        ENDIF
    NEXT
    IF tick = 23 THEN worldMode = 2
END PROC

PROCEDURE updateBonus
    ADD score, 100
    ADD playerX, 4
    worldMode = 1
END PROC

worldMode = 1
playerX = 88
playerY = 80
collisionCount = 0
score = 0
checksum = 0
initialX = 24
initialY = 48
initialDirection = 0

FOR actorIndex = 0 TO 5
    units(actorIndex).x = initialX
    units(actorIndex).y = initialY
    units(actorIndex).direction = initialDirection
    units(actorIndex).timer = 3 + actorIndex
    units(actorIndex).mode = 0
    units(actorIndex).hits = 0
    ADD initialX, 24
    ADD initialY, 8
    initialDirection = initialDirection XOR 1
NEXT

FOR tick = 0 TO 47
    ON CPUZ80 BEGIN ASM
        PUSH AF
        LD A, $CA
        XOR $FE
        XOR $FE
        CP $CA
        POP AF
    END ASM
    IF worldMode = 1 THEN
        updateActors[]
    ELSE
        updateBonus[]
    ENDIF
    ON CPUZ80 BEGIN ASM
        PUSH AF
        LD A, $BE
        XOR $EF
        XOR $EF
        CP $BE
        POP AF
    END ASM
NEXT

FOR actorIndex = 0 TO 5
    ADD checksum, units(actorIndex).x
    ADD checksum, units(actorIndex).y
    ADD checksum, units(actorIndex).timer
    ADD checksum, units(actorIndex).mode
    ADD checksum, units(actorIndex).hits
NEXT
ADD checksum, score
ADD checksum, collisionCount

DO
LOOP
