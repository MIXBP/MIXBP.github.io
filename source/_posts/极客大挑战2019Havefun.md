---
title: 极客大挑战2019Havefun
date: 2025-01-05 19:35:48
tags:
- 刷题笔记
- payload构造
category:
- 刷题笔记
---

首先查看源码

![](../image/极客大挑战2019Havefun1.png)

发现此处有被注释掉的代码

```
<!--
        $cat=$_GET['cat'];
        echo $cat;
        if($cat=='dog'){
            echo 'Syc{cat_cat_cat_cat}';
        }
        -->
```

然后构造payload

Payload：中文 ’ 有效载荷 '，指成功exploit之后，攻击代码释放的具有攻击能力的能够实现攻击者目的的代码。

```
/?cat=dog
```

##### 直接在网页地址栏中构造payload

![](../image/极客大挑战2019Havefun2.png)

这样就能得到flag了

![](../image/极客大挑战2019Havefun3.png)
