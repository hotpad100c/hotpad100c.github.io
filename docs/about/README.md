---
title: 关于
pageLayout: page
---

<!--
  「关于」页使用斜切页面组件排版，用法见仓库根目录 CUSTOMIZING.md 的「斜切页面组件」。
  组件之间、组件和 Markdown 之间都要空一行。
  方向规则：方正行（square）上下两侧的斜切行方向相反。
  本页：首屏窗口（/） → square → rev（\） → square → slant（/） → square
-->

<!--
  背景：整页是实时渲染的分形（参数在 docs/.vuepress/components/fractal/fractalPages.json 的 about）；
  首屏窗口用 bg-main（分形图），头像钉在分形中央的暗框里。
  image-x / image-y / image-size 是按 docs/images/Bg.png 量出来的：中央暗区的内切圆圆心约在 (49.8%, 49.2%)，
  直径约为图宽的 19.4%；头像宽 15.8% 时整个头像都在圆内。换背景图后需要重新调整这三个值。
  image-fill="80"：头像占窗口宽度的 80%（窗口为竖长的平行四边形，背景图围绕头像放大）。
-->

<SlantPage>

<SlantHero label="关于" image="/about/pfp.png" cover="bg-main" image-x="49.95" image-y="47.6" image-size="15.8" image-fill="80">

# 你好，我是 *Ryan100c*

也叫 **Ryan**。

这个名字的由来其实很简单：它是由我的英文名 **Ryan** 和邮箱 **hotpad100c@gmail.com** 组合而成的。

如果你跟我比较熟悉，有时我被群友叫做「人言一百草」「ryan将军」。至于将军的称号是怎么来的，我也不知道，你应该询问 *寒鱼*。

[![Minecraft](https://img.shields.io/badge/Minecraft-Ryan100c-lightpurple.svg?labelColor=purple&color=magenta)](https://namemc.com/profile/Ryan100c)

</SlantHero>

<SlantRow kind="square">

<SlantCell span="7" label="01" title="爱好">

我是一名热爱 **红石**、**编程**、**Minecraft 模组开发** 与 **视频创作** 的创作者，也是一名学生。

我从小学开始接触编程，而目前的我对 Minecraft 的游戏底层极其感兴趣。同样，我也希望能让他人 **看见那些平时看不见的游戏逻辑**。

</SlantCell>

<SlantCell span="5" label="02" title="技能">

<SkillIcons list="csharp,java,python,javascript,blender,idea,unity" />

</SlantCell>

</SlantRow>

<SlantRow kind="rev">

<SlantCell span="4" label="Modrinth" title="13 个模组" image="/about/modrinth.png" fit="contain" href="https://modrinth.com/user/ryan100c">

到目前为止，我在 Modrinth 拥有 13 个实际项目，也可以在「项目」页面浏览它们。

</SlantCell>

<SlantCell span="4" label="itch.io" title="Unity 小游戏" image="/about/itchio.jpeg" href="https://ryan100c.itch.io">

在接触 Minecraft 前，我热衷于 Unity 游戏开发，发布过数个小游戏（和一些当年爆火 Unity 游戏的破解版）。我已经很久很久没有碰 Unity 了，真是怀念啊……

</SlantCell>

<SlantCell span="4" label="GTMC" title="技术 MC 文档" image="https://socialify.git.ci/tanhHeng/GraduateTextsInTechnicalMC/image?description=1&forks=1&issues=1&pulls=1&stargazers=1&theme=Dark" href="https://de79d671.hotpad100c-github-io.pages.dev/tools/gtmc/">

我正在参与撰写 GTMC（GraduateTextsInTechnicalMC）：一本面向萌新的技术红石入门教材，也是一本面向熟练者的文档。基于 CC BY-NC-SA 4.0 协议开源。

</SlantCell>

</SlantRow>

<SlantRow kind="square">

<SlantCell span="5" label="03" title="关注我">

也许你会希望关注我的 YouTube、Bilibili，或者加入我的 Discord 服务器，我在上面发布模组更新等。

<SocialButtons />

</SlantCell>

<SlantCell span="7" label="04" title="联系方式">

<ContactList :items="[
  { label: '邮箱', value: 'hotpad100c@gmail.com', href: 'mailto:hotpad100c@gmail.com' },
  { label: 'QQ', value: '3854665503' },
  { label: 'Discord', value: 'discord.gg/323QBKeW', href: 'https://discord.gg/323QBKeW' },
]" />

</SlantCell>

</SlantRow>

<SlantRow kind="slant">

<SlantCell span="12" label="05" title="我的项目" href="/projects/">

我还有一些其它有趣的项目：模组、网页工具、渲染库……都在「项目」页面。

</SlantCell>

</SlantRow>

<SlantRow kind="square">

<SlantCell span="6" label="06" title="我贡献过的公开项目" max-height="380">

![Repos I contributed to](https://github-contrib-stats.vercel.app/Hotpad100c/contributed.svg)

</SlantCell>

<SlantCell span="6" label="07" title="我创建的公开项目" max-height="380">

![Repos I created](https://github-contrib-stats.vercel.app/Hotpad100c/created.svg)

</SlantCell>

</SlantRow>

</SlantPage>
