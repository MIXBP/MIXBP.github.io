---
title: 极客大挑战2019EasySQL
date: 2025-01-05 19:10:32
tags:
- 刷题笔记
- sql注入
category:
- 刷题笔记
---

首先进入题目网站，发现输入框，根据题目可以得知应该要SQL注入

![](../image/极客大挑战2019EasySQL1.png)

测试后发现单引号会报错，而双引号，括号和不闭合都不会报错，只会显示名称密码错误，可以得知闭合方式为单引号，字符注入

![](../image/极客大挑战2019EasySQL2.png)

接下来只需要简单的SQL注入语句 admin' or 1=1就可以得到flag

![](../image/极客大挑战2019EasySQL3.png)

这样这题就解开了。

原理：在数据库中形成的 sql 语句是 `SELECT * FROM table_name WHERE username='admin' and password='123456';`使用万能密码并且用#将后面的语句注释掉就行了。
