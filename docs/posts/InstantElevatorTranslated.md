---
title: Analysis of the Instant Elevator
date: 2026–7-26
permalink: /posts/InstantElevatorEn/
tags: [TMC, Redstone, Entities]
---


There can be several versions of different lengths:

# Root Cause in One Sentence
> **TL;DR:** `24w45a` added an extra condition to `setOnGroundWithMovement`, preventing the player's `onGround` from being updated during purely horizontal pushing, thereby allowing unlimited automatic step-up within the same game tick.

---

Recently, a design for an "[Instant Elevator](https://www.youtube.com/watch?v=IfYp7WOudlU)" (Bilibili mirror: BV1dtEJ68Eyb) emerged, attracting considerable attention.

Unfortunately, the explanations provided by the original creator, Mingyue Zhuangzhu, and CraftyMasterMan regarding the elevator's principle are not sufficiently in-depth, leaving many details inadequately explained. To fill these gaps, this article will focus on the following questions:

- At which phase of the game is the player actually teleported to the top of the elevator?
    - Misconception: Must the left-side block not connect to the wall?
- What is the specific principle behind the player's movement?
- Why can't other entities use this elevator like players can?
- Why is this elevator only possible in versions 1.21.4 and later?

---

# At Which Phase of the Game Is the Player Teleported to the Top of the Elevator?

The explanatory videos mention that the elevator's principle involves alternating piston pushes from both sides within the same game tick, causing the player to continuously step up onto the already-extended piston on the opposite side:
==One side's piston first pushes the player, causing them to step onto the piston previously extended on the other side; then, the other side's piston pushes the player again, causing them to step onto the piston that just pushed them. Repeating this cycle, the player climbs all the way to the top of the elevator within a single game tick.=={.important}

Since both videos simulate the process within a single game tick by artificially slowing down the piston activation speed, they can easily cause a misconception: ==the player's climbing seems to occur when the moving piston converts into a normal block, caused by block collision pushing the player=={.warning}. In reality, this is not the case.

In this elevator, the entire process of the player continuously climbing from the bottom to the top occurs during the ==block entity (moving piston) computation phase of the 2nd game tick after both pistons begin extending,=={.important} not after the moving pistons finish extending and convert into normal blocks.
During the block entity phase, it is the "moving piston" block entity that actively calls the entity's `move(Vec 3)` method, thereby triggering the entity's automatic step-up logic and causing the upward climb.

## Misconception: Must the Left-Side Block Not Connect to the Wall?

Mingyue Zhuangzhu's video mentions:

> If a full block is used on the left, the stone wall will connect to it, making the stone wall's collision area narrower (affecting the effective pushing range).
> Therefore, blocks that don't connect to stone walls, such as stairs or slabs, should be used.

Combined with the conclusion from the previous section "**At Which Phase of the Game Is the Player Teleported to the Top of the Elevator?**", we can re-analyze this statement.

First, according to the previous conclusion, the player's movement occurs during the ==block entity phase=={.important}. At this point, the wall block on one side is still just a "moving piston" disguised as a wall, and the same applies to the block on the other side. Therefore, no wall connection occurs between them, and naturally, there is no issue of reduced stone wall collision area due to connection.

Thus, this explanation does not hold up. As for why the original creator chose a design using stairs instead of a full block on the left side, we cannot be certain — it may have been due to concern about a similar issue.

## Corresponding Optimization:
So in reality, the machine's size can be further reduced: a sticky piston + wall on one side, and a regular piston on the other. It looks like this:

(image to be added later)

---

# What Is the Specific Principle Behind the Player's Movement?

Regarding the specific step-up mechanics, we can trace back to this logic in the `Vec3 collide(final Vec3 movement)` method in `Entity.java`:

```java
    boolean xCollision = movement.x != movementStep.x;
        boolean yCollision = movement.y != movementStep.y;
        boolean zCollision = movement.z != movementStep.z;
        boolean onGroundAfterCollision = yCollision && movement.y < 0.0;
        if (this.maxUpStep() > 0.0F && (onGroundAfterCollision || this.onGround()) && (xCollision || zCollision)) {
            AABB groundedAABB = onGroundAfterCollision ? aabb.move(0.0, movementStep.y, 0.0) : aabb;
            AABB stepUpAABB = groundedAABB.expandTowards(movement.x, this.maxUpStep(), movement.z);
            if (!onGroundAfterCollision) {
                stepUpAABB = stepUpAABB.expandTowards(0.0, -1.0E-5F, 0.0);
            }

            List<VoxelShape> colliders = collectCollidersIgnoringWorldBorder(this, this.level, entityColliders, stepUpAABB);
            float stepHeightToSkip = (float)movementStep.y;
            float[] candidateStepUpHeights = collectCandidateStepUpHeights(groundedAABB, colliders, this.maxUpStep(), stepHeightToSkip);

            for (float candidateStepUpHeight : candidateStepUpHeights) {
                Vec3 stepFromGround = collideWithShapes(new Vec3(movement.x, candidateStepUpHeight, movement.z), groundedAABB, colliders);
                if (stepFromGround.horizontalDistanceSqr() > movementStep.horizontalDistanceSqr()) {
                    double distanceToGround = aabb.minY - groundedAABB.minY;
                    return stepFromGround.subtract(0.0, distanceToGround, 0.0);
                }
            }
        }
```

Don't be afraid — here's a text-based pseudocode version:
```text
Calculate the movement result after normal collision: movementStep;

If (
    maxUpStep attribute > 0
    AND (onGroundAfterCollision OR currently onGround)
    AND (X or Z direction collision occurred)
) {
    Construct a collision area that allows step-up attempts;
    Collect all colliders within that area;
    Calculate all possible step-up heights;
    For each candidate step-up height {
        Simulate:
            First, step up by candidateStepUpHeight;
            Then, perform the original horizontal movement;
        If the simulated horizontal movement distance > the horizontal movement distance from normal collision {
            Return the "step-up movement result";
        }
    }
}

Otherwise, return the normal collision movement result;
```

In short, when a player experiences a horizontal collision AND meets the auto-step conditions (onGroundAfterCollision OR currently onGround), the game attempts to simulate different step-up heights. If a particular option allows the player to move further horizontally, it adopts that option; otherwise, it keeps the original collision result.

In the scenario where the elevator teleports players (note: **the player's scenario**, which will be detailed later):
- The player's maxUpStep attribute > 0 (otherwise, like a boat, they couldn't step over even a 1-pixel-high collider)
- The player experiences a horizontal collision with a collider 0.5 blocks above their feet on the opposite side, thus satisfying the "player experiences a horizontal collision" condition.
- The player is standing firmly before being pushed, satisfying the "currently onGround" condition.
- The "onGroundAfterCollision" condition is not met (since the piston only pushes the player horizontally, Y-axis movement is 0, so naturally, no downward vertical collision can occur).

Since "currently onGround" and "onGroundAfterCollision" have an **OR** relationship, even if the latter is not met, the player can still enter the auto-step logic.
The game then attempts to calculate the movement result after stepping up, causing the player to climb onto the top of the previously extended moving piston block on the other side.

---
# Why Can't Other Entities Use This Elevator?

This is the truly fascinating part of this elevator.
In the process of investigating this question, we not only discovered why other entities cannot use this elevator but also uncovered new mechanics and phenomena not previously noticed. Below, we will analyze them one by one.

Upon careful observation, another discovery was made: ==although entities can step up, they only step up once=={.warning}. This means some mechanism prevents entities from performing auto-stepping multiple times within the same game tick.
After an entity completes its first step-up, ==some condition must have changed=={.important}, causing it to **no longer meet the conditions required to enter the auto-step logic**.
Let's revisit the four conditions mentioned earlier and eliminate them one by one:

> - `Entity's maxUpStep attribute > 0`: Definitely true — for most entities like villagers, this attribute is greater than 0.
> - `Entity experiences a horizontal collision with a collider 0.5 blocks above its feet on the opposite side, satisfying the horizontal collision condition`: Definitely true — when pushed, the entity will inevitably be stopped by the other side.
> - `onGroundAfterCollision condition is not met (since the piston only pushes horizontally, Y-axis movement is 0, so naturally, no downward vertical collision can occur)`: Definitely false, as described in parentheses.

That leaves only one suspicious condition:

> - `Entity was standing firmly before being pushed, satisfying the "currently onGround" condition`

Using the **1.21.1** Fabric Mod development environment with breakpoint debugging, we verified this hypothesis.

When an entity is pushed by a piston for the first time, it successfully enters the auto-step logic; however, when pushed a second time, it does not re-enter that logic. We found that the `onGround` variable, indicating **whether the entity is currently on the ground**, changed from `true` to `false` after the first step-up was completed, and remained `false` throughout all subsequent pushes within the same game tick, only returning to `true` in the next game tick.

This explains why other entities can only complete **the first step-up**: after the first step-up, the `onGround` state is no longer true, preventing them from meeting the **"currently onGround"** condition required for auto-stepping, so subsequent pushes no longer trigger the auto-step logic.

## The question is, what causes this, and why isn't the player's `onGround` state reset to `false`?

Let's continue tracing the source code to see how `onGround` is actually set.

Entity movement is handled by the `move` method. In this method, the game first calls the `collide` method analyzed earlier to calculate the actual movement result after collision; then, based on the movement result, it updates the entity's collision state and determines whether it is on the ground.

In **1.21.11**, this logic looks like:

```java
boolean xCollision = !Mth.equal(delta.x, movement.x);
boolean zCollision = !Mth.equal(delta.z, movement.z);
this.horizontalCollision = xCollision || zCollision;
boolean movedVertically = Math.abs(delta.y) > 0.0;
if (movedVertically || this.isLocalInstanceAuthoritative()) {
    this.verticalCollision = delta.y != movement.y;
    this.verticalCollisionBelow = this.verticalCollision && delta.y < 0.0;
    this.setOnGroundWithMovement(this.verticalCollisionBelow, this.horizontalCollision, movement);
}
```
Pseudocode:
```text
Call collide() to calculate the actual movement result after collision: delta

Calculate whether a horizontal collision occurred (whether the actual position after movement is the same as "pre-movement position + momentum")

If (
    Y momentum is non-zero
    OR
    The local [server-side] entity has authority over its own position // Note this!
) {    
    Calculate whether a vertical collision occurred;
    Set onGround to: "vertical collision occurred AND Y momentum < 0"
}
```

We can also analyze the logical behavior of this section during horizontal piston pushing:

- Y momentum non-zero: False — horizontal pushing provides no Y-axis momentum.
- The local [server-side] entity has authority over its own position: ==this.isLocalInstanceAuthoritative(), to be examined, let's assume it passes for now.==

Therefore, for entities like villagers, they can enter this "set onGround" logic.

Next:

- Vertical collision occurred: False — the piston provides no Y-axis momentum.
- Vertical collision occurred AND Y momentum < 0: False ~~"the piston provides no Y-axis momentum" has been said n times already haha~~

Thus, the entity's `onGround` is set to `false`?!

In other words, in the elevator's operating environment, as long as `this.isLocalInstanceAuthoritative()` returns `true`, after the entity completes its first step-up, `onGround` is immediately recalculated and becomes `false` because no downward collision occurred. Consequently, subsequent pushes can no longer satisfy the **"currently onGround"** condition, and naturally, the auto-step logic cannot be entered again.

So what exactly is `this.isLocalInstanceAuthoritative()`? Let's continue examining the source code:

```java
public final boolean isLocalInstanceAuthoritative() {
    return this.level.isClientSide()
        ? this.isLocalClientAuthoritative()
        : !this.isClientAuthoritative();
}

protected boolean isLocalClientAuthoritative() {
    LivingEntity passenger = this.getControllingPassenger();
    return passenger != null && passenger.isLocalClientAuthoritative();
}

public boolean isClientAuthoritative() {
    LivingEntity passenger = this.getControllingPassenger();
    return passenger != null && passenger.isClientAuthoritative();
}
```

As can be seen, this is essentially a **movement authority mechanism** (Authority — at least, that's how I prefer to describe it).

For the vast majority of entities, `isClientAuthoritative()` returns `false`, so in a server-side environment, `isLocalInstanceAuthoritative()` is **`true`**. This means their `onGround` is immediately updated after every movement, ==thus losing the opportunity to re-enter the auto-step logic after the first step-up.=={.important}

However, for **player entities** and **vehicles being ridden by players**, `isClientAuthoritative()` returns, or returns `true` due to being controlled by a player, thereby making the server-side `isLocalInstanceAuthoritative()` return **`false`**. In this case, `onGround` is not immediately recalculated after each horizontal push, allowing it to remain `true`!

This allows the entity to repeatedly enter the auto-step logic within the same game tick, ultimately climbing all the way to the elevator top.

Therefore, **it is not only players who can use this elevator.**
Any entity that **can be controlled by a player** and **has the ability to step over blocks** can also use this elevator normally **while being ridden by a player**.
For example, **horses**, **camels**, and certain mod entities that meet the above conditions can all use this elevator normally.
It's worth noting that while **pigs** and **llamas** can also be ridden by players, players do not actually have control over their movement, so they do not qualify as client-authoritative entities and cannot use this elevator through this mechanism.

## Corresponding Optimization:

This discovery also leads to a more radical optimization idea.

A horse's **maxUpStep** attribute reaches **1 full block**. This means that when a player rides a horse to use the elevator, both sides can use **regular pistons**, without needing the **sticky piston + wall** design to provide a 0.5-block-high collider.

When riding a horse, this elevator can fully adopt a simpler dual regular piston structure.
However, as of now (2026/6/26), no one has publicly proposed or implemented a similar design.

## Takeaways:

In the process of analyzing this mechanic, we also discovered two interesting mechanics and one unexplained Carpet mod issue:

* **Normal entities**, when undergoing only **horizontal movement** (Y-axis momentum = 0), will have their `onGround` updated to `false`, regardless of whether they are actually standing on the ground.

  > Notably, most entities are continuously affected by gravity during autonomous movement, so even when standing on the ground, their Y-axis momentum is usually not 0. This phenomenon is generally not easily observed under normal circumstances.

* **Players** and **player-controlled entities**, when undergoing only **horizontal movement** (Y-axis momentum = 0), do not have their `onGround` automatically updated, allowing them to enter the auto-step logic multiple times within the same game tick.

  > Similarly, since entities are normally always affected by gravity, this mechanic is also not obvious during normal gameplay.

* The entity controlled by **Carpet mod's fake player** cannot reproduce the second behavior; its performance differs from that of a vanilla player. The specific reason has not yet been identified and awaits further research. This is yet another behavioral difference discovered between Carpet fake players and vanilla players.
  
 ---
 
# Why Is This Elevator Only Possible in Versions 1.21.4 and Later?

With the previous analysis, the answer to this question becomes quite simple.

By comparing source code across different versions, we can see that the `isLocalInstanceAuthoritative` **movement authority mechanism** began constraining the update of `onGround` around **25w02a**. Before this, such as in **1.21.3**, the recalculation of `onGround` was **not constrained by any conditions**:

```java
this.horizontalCollision = bl || bl2;
this.verticalCollision = vec3.y != vec32.y;
this.verticalCollisionBelow = this.verticalCollision && vec3.y < 0.0;
if (this.horizontalCollision) {
    this.minorHorizontalCollision = this.isHorizontalCollisionMinor(vec32);
} else {
    this.minorHorizontalCollision = false;
}
this.setOnGroundWithMovement(this.verticalCollisionBelow, this.horizontalCollision, vec32); //不受任何约束
BlockPos blockPos = this.getOnPosLegacy();
BlockState blockState = this.level().getBlockState(blockPos);
if (!this.level().isClientSide() || this.isControlledByLocalInstance()) {
    this.checkFallDamage(vec32.y, this.onGround(), blockState, blockPos);
}

```
Therefore, in this period, players, like other entities, could only step up once, and would then be unable to step up again because `onGround` became `false`!

Upon specific investigation, we found the key initial modification. Now, we can map out the complete code change path:

- Before 24w44a:
```java
this.verticalCollision = vec3.y != vec32.y;
this.verticalCollisionBelow = this.verticalCollision && vec3.y < 0.0;
if (this.horizontalCollision) {
    this.minorHorizontalCollision = this.isHorizontalCollisionMinor(vec32);
} else {
    this.minorHorizontalCollision = false;
}
this.setOnGroundWithMovement(this.verticalCollisionBelow, this.horizontalCollision, vec32); //不受任何约束

```

- 24w45a:
```java
if (this.horizontalCollision) {// [!code --]
    this.minorHorizontalCollision = this.isHorizontalCollisionMinor(vec32);// [!code --]
} else {// [!code --]
    this.minorHorizontalCollision = false;// [!code --]
}// [!code --]

if (Math.abs(vec3.y) > 0.0 || this.isControlledByOrIsLocalPlayer()) {// [!code ++]
            this.verticalCollision = vec3.y != vec32.y;
            this.verticalCollisionBelow = this.verticalCollision && vec3.y < 0.0;
            this.setOnGroundWithMovement(this.verticalCollisionBelow, this.horizontalCollision, vec32);
}
```
- 25w02a and later:
```java
if (movedVertically || this.isControlledByOrIsLocalPlayer()) {// [!code --]
if (movedVertically || this.isLocalInstanceAuthoritative()) {// [!code ++]
    this.verticalCollision = delta.y != movement.y;
    this.verticalCollisionBelow = this.verticalCollision && delta.y < 0.0;
    this.setOnGroundWithMovement(this.verticalCollisionBelow, this.horizontalCollision, movement);
}
```
Thus, we can determine that the elevator's specific usable range begins from the `24w45a` snapshot.

---

# Summary

> **Summary:** The instant elevator became possible starting from the `24w45a` snapshot.
> The root cause is that `setOnGroundWithMovement` in the `move` method added the condition
>  `movedVertically || this.isLocalInstanceAuthoritative()` in this version. Previously,
>  when moving an entity purely horizontally (e.g., horizontal piston pushing, Y momentum = 0),
> `onGround` would always be updated to `false`, preventing the entity from utilizing auto-stepping
>  multiple times within the same game tick to continuously ascend. However, for players and player-controlled
> entities, `isLocalInstanceAuthoritative()` is always `false`, so when only horizontal pushing is applied (`movedVertically == false`),
>  `setOnGroundWithMovement` is no longer executed, thus not resetting `onGround` to `false`. This allows players, etc., to repeatedly maintain
> `onGround = true` within the same game tick and continuously trigger auto-stepping, thereby achieving unlimited step-up, i.e., the instant elevator.
