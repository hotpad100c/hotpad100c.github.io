# 素材：MC-310372

## 漏洞报告

链接：https://bugs.mojang.com/browse/MC/issues/MC-310372

我自己翻译的报告前半段（后半段是针对 MC-305475 的修复建议，我不打算放）：

> 在 26.2 中，为了修复 MC-305475，绊线（Tripwire）在失去红石信号后会为自己安排一个 0gt 延迟的计划刻（scheduled tick），并在该计划刻中检查自身是否仍有计划刻，以防止它在断电后立即重新上电。
>
> 问题在于，游戏刻（game tick）已经完成计划刻收集之后再添加的 0gt 延迟计划刻，并没有被计划刻调度逻辑正确处理。
>
> 这会导致，在计划刻阶段（scheduled tick phase）中，一个区块（chunk）最先执行的计划刻变成这个 0gt 延迟计划刻，因为根据 DRAIN_ORDER，它的 trigger tick 比该区块内其他所有计划刻都更早。
>
> 然而，在游戏收集即将执行的计划刻时，选择区块计划刻容器（chunk tick container）所依据的是 INTRA_TICK_DRAIN_ORDER。该排序完全忽略了 trigger tick，而是直接按照 TickPriority 和 subTickOrder 排序。
>
> 由于这个 0gt 延迟计划刻使用的是 TickPriority.NORMAL，同时又拥有很高的 subTickOrder（因为它是在计划刻执行期间以 0 延迟安排的），这会导致下一游戏刻中，该区块的计划刻会比其他区块更晚处理，即使按照正常顺序它们本不应该如此。
>
> 注意：任何依赖跨区块方块计划刻执行顺序（cross-chunk block tick ordering），且包含已激活绊线的装置，都可能受到该问题影响。

## 源码（Mojang 映射，26.2）

`LevelTicks.tick()` 会调用 `collectTicks()`。collectTicks 里先 `sortContainersToTick`：遍历 `nextTickForContainer`，把下次触发时间 <= 当前时间的区块容器（`LevelChunkTicks`）放进优先队列 `containersToTick`，然后 `drainContainers`。

```java
private static final Comparator<LevelChunkTicks<?>> CONTAINER_DRAIN_ORDER = (levelChunkTicks, levelChunkTicks2) -> ScheduledTick.INTRA_TICK_DRAIN_ORDER
		.compare(levelChunkTicks.peek(), levelChunkTicks2.peek());
```

```java
public static final Comparator<ScheduledTick<?>> INTRA_TICK_DRAIN_ORDER = (scheduledTick, scheduledTick2) -> {
	int i = scheduledTick.priority.compareTo(scheduledTick2.priority);
	return i != 0 ? i : Long.compare(scheduledTick.subTickOrder, scheduledTick2.subTickOrder);
};
```

LevelChunkTicks 里：

```java
private final Queue<ScheduledTick<T>> tickQueue = new PriorityQueue(ScheduledTick.DRAIN_ORDER);

public static final Comparator<ScheduledTick<?>> DRAIN_ORDER = (scheduledTick, scheduledTick2) -> {
	int i = Long.compare(scheduledTick.triggerTick, scheduledTick2.triggerTick);
	if (i != 0) {
		return i;
	} else {
		i = scheduledTick.priority.compareTo(scheduledTick2.priority);
		return i != 0 ? i : Long.compare(scheduledTick.subTickOrder, scheduledTick2.subTickOrder);
	}
};
```

drainContainers 每次取 containersToTick 的队首容器，然后：

```java
private void drainFromCurrentContainer(Queue<LevelChunkTicks<T>> queue, LevelChunkTicks<T> levelChunkTicks, long l, int i) {
	if (this.canScheduleMoreTicks(i)) {
		LevelChunkTicks<T> levelChunkTicks2 = (LevelChunkTicks)queue.peek();
		ScheduledTick<T> scheduledTick = levelChunkTicks2 != null ? levelChunkTicks2.peek() : null;

		while(this.canScheduleMoreTicks(i)) {
			ScheduledTick<T> scheduledTick2 = levelChunkTicks.peek();
			if (scheduledTick2 == null 
				|| scheduledTick2.triggerTick() > l
				|| scheduledTick != null && ScheduledTick.INTRA_TICK_DRAIN_ORDER.compare(scheduledTick2, scheduledTick) > 0) {
				break;
			}

			levelChunkTicks.poll();
			this.scheduleForThisTick(scheduledTick2);
		}
	}
// ...
```

（break 之后当前区块会被放回 containersToTick。）

## 实际案例

- 6gt 循环的侦测器高频，侦测器 A 在左边区块，B 在右边区块。正常顺序是 A 亮起后 B 才熄灭，B 亮起后 A 才熄灭。图：media/bad_observer.png（黄线是区块分界）
- 把它变成 4gt 需要反转成「A 熄灭，B 亮起」，参考 https://www.bilibili.com/video/BV1M3YuzkEf7/
- 做法：
  1. 第 0gt 玩家踩绊线，绊线第 10gt 失去信号并调度 0gt 计划刻
  2. 第 7gt 在区块 A 放侦测器 A
  3. 第 9gt 侦测器 B 亮起
  4. 第 10gt 绊线调度 0gt 计划刻
  5. 第 11gt 这个 0gt 计划刻被执行，区块 A 的计划刻被延后，变成 B 熄灭后 A 才亮起，变成 4gt 高频
- 验证视频：https://www.bilibili.com/video/BV1haGc6WE6o

## 其他想法

- 绊线不是唯一能触发的，它只是让情况恶化
- 计划刻 EMP 的时候理论上也会这样（没测）
- 这个评论里说的情况理论上也是：https://www.bilibili.com/video/BV18SKs6qEVf?comment_on=1&comment_root_id=307078647649&share_tag=s_i#reply307078647649
