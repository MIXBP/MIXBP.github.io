---
title: GWCTF2019-枯燥的抽奖
date: 2025-04-02 17:20:11
tags:
- mt_srand伪随机数漏洞
- php_mt_seed工具
category:
- 刷题笔记
---

首先一进去告诉我们要猜测字符串

查看网页源代码发现一个check.php，打开可以看到源码

```
<?php
#这不是抽奖程序的源代码！不许看！
header("Content-Type: text/html;charset=utf-8");
session_start();
if(!isset($_SESSION['seed'])){
$_SESSION['seed']=rand(0,999999999);
}

mt_srand($_SESSION['seed']);
$str_long1 = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
$str='';
$len1=20;
for ( $i = 0; $i < $len1; $i++ ){
    $str.=substr($str_long1, mt_rand(0, strlen($str_long1) - 1), 1);       
}
$str_show = substr($str, 0, 10);
echo "<p id='p1'>".$str_show."</p>";


if(isset($_POST['num'])){
    if($_POST['num']===$str){x
        echo "<p id=flag>抽奖，就是那么枯燥且无味，给你flag{xxxxxxxxx}</p>";
    }
    else{
        echo "<p id=flag>没抽中哦，再试试吧</p>";
    }
}
show_source("check.php");

```

可以注意到我们猜测字符串是采用伪随机函数依据种子生成的，所以我们可以利用脚本通过给出的部分字符串逆推出伪随机函数采用的种子（这里脚本采用的是php_mt_seed）。

先使用PHP编写程序把给出的部分字符串处理成脚本需要的数据格式，php_mt_seed工具需要我们提供随机数前十位，这里正好十位，所以我们用脚本转10进制，程序源码如下：

```
str1 ='RjLPc2jmUg'
str2 = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
result =''


length = str(len(str2)-1)
for i in range(0,len(str1)):
    for j in range(0,len(str2)):
        if str1[i] ==  str2[j]:
            result += str(j) + ' ' +str(j) + ' ' + '0' + ' ' + length + ' '
            break


print(result)

```

php脚本

```
<?php
error_reporting(0);
$str_long1 = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
$string='RjLPc2jmUg';
$len1=20;
for ( $i = 0; $i < $len1; $i++ ){
$pos=strpos($str_long1,$string[$i]);
    echo $pos." ".$pos." 0 61 " ;  
}
?>
```

结果

```
53 53 0 61 9 9 0 61 47 47 0 61 51 51 0 61 2 2 0 61 28 28 0 61 9 9 0 61 12 12 0 61 56 56 0 61 6 6 0 61
```

使用php_mt_seed工具

```
./php_mt_seed 53 53 0 61 9 9 0 61 47 47 0 61 51 51 0 61 2 2 0 61 28 28 0 61 9 9 0 61 12 12 0 61 56 56 0 61 6 6 0 61
```

```
得到种子为856151724
```

放入php中执行代码，模拟源码得到完整字符串

```
<?php
mt_srand(856151724);
$str_long1 = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
$str='';
$len1=20;
for ( $i = 0; $i < $len1; $i++ ){
    $str.=substr($str_long1, mt_rand(0, strlen($str_long1) - 1), 1);       
}
echo "<p id='p1'>".$str."</p>";
?> 

```

```
得到完整字符串为RjLPc2jmUgtGjKtpixK4
```

拿到flag
