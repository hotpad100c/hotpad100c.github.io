---
permalink: /mcCodeIndex/ClientPackets
---
# Minecraft ClientPacketListener.java 中出现的 Packet


数据来源于代码解析（imports 和方法使用），覆盖所有提及的 ~120 个数据包。**由Grok索引与分析，需人工核查**

## 1. 实体相关数据包（Entity Management）

| 数据包名称 | 方向 | 用途 | 携带的数据 |
|------------|------|------|-------------|
| ClientboundAddEntityPacket | Clientbound | 添加新实体到世界（如玩家、生物、物品）。 | getId, getType, getUUID |
| ClientboundSetEntityMotionPacket | Clientbound | 设置实体的运动速度（速度向量）。 | getId, getMovement |
| ClientboundSetEntityDataPacket | Clientbound | 同步实体的元数据（SynchedEntityData）。 | id, packedItems |
| ClientboundEntityPositionSyncPacket | Clientbound | 同步实体位置（包括旋转和地面状态）。 | id, values, onGround |
| ClientboundTeleportEntityPacket | Clientbound | 传送实体到新位置。 | id, change, relatives, onGround |
| ClientboundMoveEntityPacket | Clientbound | 移动实体（位置和旋转变化）。 | getEntity, hasPosition, hasRotation, getXa/getYa/getZa/getYRot/getXRot, isOnGround |
| ClientboundMoveMinecartPacket | Clientbound | 处理矿车沿轨道移动。 | getEntity, lerpSteps |
| ClientboundRotateHeadPacket | Clientbound | 旋转实体头部。 | getEntity, getYHeadRot |
| ClientboundRemoveEntitiesPacket | Clientbound | 移除多个实体。 | getEntityIds |
| ClientboundSetPassengersPacket | Clientbound | 设置实体的乘客。 | getVehicle, getPassengers |
| ClientboundSetEntityLinkPacket | Clientbound | 设置实体间的连接（如拴绳）。 | (代码中提及但未详尽) |
| ClientboundAnimatePacket | Clientbound | 实体动画（如挥手、受伤）。 | getId, getAction |
| ClientboundHurtAnimationPacket | Clientbound | 实体受伤动画。 | id, yaw |
| ClientboundTakeItemEntityPacket | Clientbound | 处理实体拾取物品（经验球或物品）。 | getItemId, getPlayerId, getAmount |
| ClientboundSetEquipmentPacket | Clientbound | 设置实体装备。 | getEntity, getSlots |
| ClientboundUpdateMobEffectPacket | Clientbound | 添加或更新实体效果（如药水效果）。 | getEntityId, getEffect, getEffectDurationTicks, getEffectAmplifier, isEffectAmbient, isEffectVisible, effectShowsIcon, shouldBlend |
| ClientboundRemoveMobEffectPacket | Clientbound | 移除实体效果。 | getEntity, effect |
| ClientboundUpdateAttributesPacket | Clientbound | 更新实体属性（如生命值、速度）。 | getEntityId, getValues |
| ClientboundProjectilePowerPacket | Clientbound | 设置投射物（如火球）的加速度。 | getId, getAccelerationPower |
| ClientboundSoundEntityPacket | Clientbound | 播放实体相关声音。 | getId, getSound, getSource, getVolume, getPitch, getSeed |

## 2. 世界与区块相关数据包（World & Chunk Management）

| 数据包名称 | 方向 | 用途 | 携带的数据 |
|------------|------|------|-------------|
| ClientboundLevelChunkWithLightPacket | Clientbound | 加载带有光照的区块。 | getX, getZ, getChunkData, getLightData |
| ClientboundChunksBiomesPacket | Clientbound | 更新区块生物群系。 | chunkBiomeData |
| ClientboundForgetLevelChunkPacket | Clientbound | 卸载区块。 | pos |
| ClientboundBlockUpdatePacket | Clientbound | 更新单个方块状态。 | getPos, getBlockState |
| ClientboundSectionBlocksUpdatePacket | Clientbound | 更新区块部分内的多个方块。 | (批量 pos, state) |
| ClientboundLightUpdatePacket | Clientbound | 更新光照数据。 | getX, getZ, getLightData |
| ClientboundSetChunkCacheRadiusPacket | Clientbound | 设置区块缓存半径（渲染距离）。 | getRadius |
| ClientboundSetSimulationDistancePacket | Clientbound | 设置模拟距离。 | simulationDistance |
| ClientboundSetChunkCacheCenterPacket | Clientbound | 设置区块缓存中心。 | getX, getZ |
| ClientboundBlockChangedAckPacket | Clientbound | 确认方块变化序列。 | sequence |
| ClientboundChunkBatchStartPacket | Clientbound | 开始批量区块传输。 | (批量开始) |
| ClientboundChunkBatchFinishedPacket | Clientbound | 完成批量区块传输。 | batchSize |
| ClientboundTickingStatePacket | Clientbound | 更新世界 ticking 状态（tick 速率、冻结）。 | tickRate, isFrozen |
| ClientboundTickingStepPacket | Clientbound | 设置 ticking 步数。 | tickSteps |
| ClientboundSetTimePacket | Clientbound | 设置世界时间。 | gameTime, dayTime, tickDayTime |
| ClientboundSetDefaultSpawnPositionPacket | Clientbound | 设置默认重生位置。 | respawnData |
| ClientboundInitializeBorderPacket | Clientbound | 初始化世界边界。 | getNewCenterX, getNewCenterZ, getLerpTime, getOldSize, getNewSize, getNewAbsoluteMaxSize, getWarningBlocks, getWarningTime |
| ClientboundSetBorderCenterPacket | Clientbound | 设置边界中心。 | getNewCenterX, getNewCenterZ |
| ClientboundSetBorderLerpSizePacket | Clientbound | 线性插值边界大小。 | getOldSize, getNewSize, getLerpTime |
| ClientboundSetBorderSizePacket | Clientbound | 设置边界大小。 | getSize |
| ClientboundSetBorderWarningDistancePacket | Clientbound | 设置边界警告距离。 | getWarningBlocks |
| ClientboundSetBorderWarningDelayPacket | Clientbound | 设置边界警告延迟。 | getWarningDelay |
| ClientboundLevelEventPacket | Clientbound | 触发世界事件（如声音、粒子）。 | getType, getPos, getData, isGlobalEvent |
| ClientboundLevelParticlesPacket | Clientbound | 添加粒子效果。 | getCount, getParticle, isOverrideLimiter, alwaysShow, getX/getY/getZ, getXDist/getYDist/getZDist, getMaxSpeed |
| ClientboundGameEventPacket | Clientbound | 处理游戏事件（如下雨、游戏模式变化）。 | getEvent, getParam |
| ClientboundBlockEventPacket | Clientbound | 触发方块事件（如活塞移动）。 | getPos, getBlock, getB0, getB1 |
| ClientboundBlockDestructionPacket | Clientbound | 更新方块破坏进度。 | getId, getPos, getProgress |

## 3. 玩家与库存相关数据包（Player & Inventory）

| 数据包名称 | 方向 | 用途 | 携带的数据 |
|------------|------|------|-------------|
| ClientboundLoginPacket | Clientbound | 处理登录，设置世界和玩家。 | commonPlayerSpawnInfo, levels, chunkRadius, simulationDistance, hardcore, reducedDebugInfo, showDeathScreen, doLimitedCrafting, playerId, enforcesSecureChat |
| ClientboundPlayerPositionPacket | Clientbound | 设置玩家位置和旋转。 | change, relatives, id |
| ClientboundPlayerRotationPacket | Clientbound | 设置玩家旋转。 | relativeY, relativeX, yRot, xRot |
| ClientboundSetHeldSlotPacket | Clientbound | 设置手持槽位。 | slot |
| ClientboundSetCursorItemPacket | Clientbound | 设置鼠标拖拽物品。 | contents |
| ClientboundSetPlayerInventoryPacket | Clientbound | 设置玩家库存物品。 | slot, contents |
| ClientboundContainerSetContentPacket | Clientbound | 设置容器内容（如背包）。 | containerId, stateId, items, carriedItem |
| ClientboundContainerSetDataPacket | Clientbound | 设置容器数据（如熔炉进度）。 | getContainerId, getId, getValue |
| ClientboundContainerClosePacket | Clientbound | 关闭容器。 | (containerId) |
| ClientboundOpenBookPacket | Clientbound | 打开书本界面。 | getHand |
| ClientboundOpenSignEditorPacket | Clientbound | 打开告示牌编辑。 | getPos, isFrontText |
| ClientboundBlockEntityDataPacket | Clientbound | 更新方块实体数据。 | getPos, getType, getTag |
| ClientboundMerchantOffersPacket | Clientbound | 更新商人交易列表。 | getContainerId, getOffers, getVillagerXp, getVillagerLevel, showProgress, canRestock |
| ClientboundPlaceGhostRecipePacket | Clientbound | 放置幽灵配方（合成预览）。 | containerId, recipeDisplay |
| ClientboundCooldownPacket | Clientbound | 设置物品冷却。 | cooldownGroup, duration |
| ClientboundPlayerAbilitiesPacket | Clientbound | 更新玩家能力（如飞行）。 | isFlying, canInstabuild, isInvulnerable, canFly, getFlyingSpeed, getWalkingSpeed |
| ClientboundPlayerCombatEndPacket | Clientbound | 结束战斗。 | (无具体) |
| ClientboundPlayerCombatEnterPacket | Clientbound | 开始战斗。 | (无具体) |
| ClientboundPlayerCombatKillPacket | Clientbound | 玩家死亡。 | playerId, message |
| ClientboundChangeDifficultyPacket | Clientbound | 改变难度。 | difficulty, locked |
| ClientboundSetCameraPacket | Clientbound | 设置相机实体。 | getEntity |
| ClientboundPlayerLookAtPacket | Clientbound | 让玩家看向指定位置。 | getPosition, getFromAnchor |
| ClientboundAwardStatsPacket | Clientbound | 更新统计数据。 | stats |
| ClientboundUpdateAdvancementsPacket | Clientbound | 更新进度。 | (advancements data) |
| ClientboundSelectAdvancementsTabPacket | Clientbound | 选择进度标签。 | getTab |

## 4. 聊天与命令相关数据包（Chat & Commands）

| 数据包名称 | 方向 | 用途 | 携带的数据 |
|------------|------|------|-------------|
| ClientboundSystemChatPacket | Clientbound | 系统聊天消息。 | content, overlay |
| ClientboundPlayerChatPacket | Clientbound | 玩家聊天消息。 | globalIndex, body, signature, sender, unsignedContent, filterMask, chatType |
| ClientboundDisguisedChatPacket | Clientbound | 伪装聊天消息。 | message, chatType |
| ClientboundDeleteChatPacket | Clientbound | 删除聊天消息。 | messageSignature |
| ClientboundCustomChatCompletionsPacket | Clientbound | 自定义聊天补全。 | action, entries, id |
| ClientboundCommandsPacket | Clientbound | 更新命令树。 | getRoot |
| ClientboundCommandSuggestionsPacket | Clientbound | 命令建议。 | id, toSuggestions |
| ServerboundChatPacket | Serverbound | 发送聊天消息。 | content, timeStamp, salt, signature, update |
| ServerboundChatCommandPacket | Serverbound | 发送命令。 | command |
| ServerboundChatCommandSignedPacket | Serverbound | 发送签名命令。 | command, timeStamp, salt, argumentSignatures, update |
| ServerboundChatAckPacket | Serverbound | 确认聊天消息。 | offset |
| ServerboundChatSessionUpdatePacket | Serverbound | 更新聊天会话。 | (chat session data) |

## 5. 其他数据包（Miscellaneous）

| 数据包名称 | 方向 | 用途 | 携带的数据 |
|------------|------|------|-------------|
| ClientboundStartConfigurationPacket | Clientbound | 开始配置阶段。 | (配置开始) |
| ClientboundBossEventPacket | Clientbound | 更新 Boss 栏。 | (boss data) |
| ClientboundMapItemDataPacket | Clientbound | 更新地图数据。 | mapId, scale, locked, applyToMap |
| ClientboundUpdateRecipesPacket | Clientbound | 更新配方。 | itemSets, stonecutterRecipes |
| ClientboundRecipeBookAddPacket | Clientbound | 添加配方到配方书。 | replace, entries (contents, highlight, notification) |
| ClientboundRecipeBookRemovePacket | Clientbound | 移除配方。 | recipes |
| ClientboundRecipeBookSettingsPacket | Clientbound | 更新配方书设置。 | bookSettings |
| ClientboundSoundPacket | Clientbound | 播放声音。 | getX/getY/getZ, getSound, getSource, getVolume, getPitch, getSeed |
| ClientboundStopSoundPacket | Clientbound | 停止声音。 | getName, getSource |
| ClientboundServerDataPacket | Clientbound | 更新服务器数据（如 MOTD）。 | motd, iconBytes |
| ClientboundClearTitlesPacket | Clientbound | 清除标题。 | shouldResetTimes |
| ClientboundSetTitleTextPacket | Clientbound | 设置标题文本。 | text |
| ClientboundSetSubtitleTextPacket | Clientbound | 设置副标题。 | text |
| ClientboundSetTitlesAnimationPacket | Clientbound | 设置标题动画时间。 | getFadeIn, getStay, getFadeOut |
| ClientboundTabListPacket | Clientbound | 更新标签列表头尾。 | header, footer |
| ClientboundPlayerInfoUpdatePacket | Clientbound | 更新玩家信息（如游戏模式、延迟）。 | newEntries, entries, actions |
| ClientboundPlayerInfoRemovePacket | Clientbound | 移除玩家信息。 | profileIds |
| ClientboundUpdateTagsPacket | Clientbound | 更新标签。 | getTags |
| ClientboundBundlePacket | Clientbound | 捆绑多个子数据包。 | subPackets |
| ClientboundDebugSamplePacket | Clientbound | 调试样本数据。 | sample, debugSampleType |
| ClientboundPongResponsePacket | Clientbound | Pong 响应。 | (pong data) |
| ClientboundTestInstanceBlockStatus | Clientbound | 测试实例方块状态。 | status, size |
| ClientboundTrackedWaypointPacket | Clientbound | 更新追踪路点。 | (waypoint data) |
| ClientboundDebugChunkValuePacket | Clientbound | 调试区块值。 | chunkPos, update |
| ClientboundDebugBlockValuePacket | Clientbound | 调试方块值。 | blockPos, update |
| ClientboundDebugEntityValuePacket | Clientbound | 调试实体值。 | entityId, update |
| ClientboundDebugEventPacket | Clientbound | 调试事件。 | event |
| ClientboundGameTestHighlightPosPacket | Clientbound | 高亮游戏测试位置。 | absolutePos, relativePos |
| ServerboundAcceptTeleportationPacket | Serverbound | 接受传送。 | id |
| ServerboundMovePlayerPacket | Serverbound | 发送玩家移动。 | PosRot (x,y,z,yRot,xRot,onGround) |
| ServerboundMoveVehiclePacket | Serverbound | 发送载具移动。 | fromEntity |
| ServerboundClientCommandPacket | Serverbound | 客户端命令（如重生）。 | Action |
| ServerboundConfigurationAcknowledgedPacket | Serverbound | 确认配置。 | INSTANCE |
| ServerboundChunkBatchReceivedPacket | Serverbound | 确认批量区块接收。 | desiredChunksPerTick |
| ServerboundClientInformationPacket | Serverbound | 发送客户端信息（如设置）。 | information |
| ServerboundPlayerLoadedPacket | Serverbound | 通知玩家加载完成。 | (空) |

## 总结与注意
- **携带的数据**：基于代码中 `packet.getXXX()` 或直接 `packet.XXX()` 的唯一字段列表，代表序列化数据（如 ID、位置 Vec3、状态 Bool、列表等）。完整类型需参考 Minecraft 协议（e.g., VarInt for ID, NBT for data）。
- **总数**：~100 Clientbound + ~12 Serverbound（从代码 imports 提取）。
- **来源**：纯代码分析，无外部假设。部分空因代码截断或无 getter。
- **协议版本**：对应 Minecraft 1.21+（含新 packet 如 TickingState）。如需二进制结构，参考 [Minecraft Wiki Protocol](https://minecraft.wiki/w/Java_Edition_protocol/Packets)。
