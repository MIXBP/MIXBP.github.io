---
title: php特性
date: 2025-03-02 20:14:41
tags:
- php特性
category:
- 学习笔记
---

### preg_match()

[preg_match函数用法](https://www.runoob.com/php/php-preg_match.html)，[正则表达式语法](https://www.runoob.com/regexp/regexp-tutorial.html)。

`preg_match()`：执行正则表达式，进行字符串过滤。。`[0-9]`匹配0-9之间的所有字符。`/`相当于一个分隔符，`/../`之间的内容就是正则的语法。绕过方法：变量num为人工分配 ID 键的数值型数组，`preg_match()`就会失效。如`num[]=1,num[0]=1`

---

### intval()

[intval函数用法](https://www.runoob.com/php/php-intval-function.html)

**`intval()`：将变量的值默认转化为十进制。绕过方法：可以使用==的特性，如+16、16.0；或者进制转换后，左右变量也相等。**   

**int intval ( mixed $var [, int $base = 10 ] )**

**参数说明：**
    **$var：要转换成 integer 的数量值。**
    **$base：转化所使用的进制。**
**如果 base 是 0，通过检测 var 的格式来决定使用的进制：**
    **如果字符串包括了 "0x" (或 "0X") 的前缀，使用 16 进制 (hex)；否则，**
    **如果字符串以 "0" 开始，使用 8 进制(octal)；否则，**
    **将使用 10 进制 (decimal)。**

1. **使用array()类型的数组，`intval`遇到空数组为0，非空数组为1.**
2. **使用人工分配 ID 键的数值型数组，`intval`遇到空数组为0，非空数组为1。**

---

### 强类型比较

在php中，三个等号“===”是全等比较运算符，用于比较两个操作数的值是否相等，同时检测它们的类型

是否相同；只有两边的值和数据类型都相等时，运算结果才是TRUE。可以使用**进制转换**进行绕过

---

### 正则匹配模式

```
/i表示匹配大小写

字符 ^ 和 $ 同时使用时，表示精确匹配，需要匹配以php开头和以php结尾

m
多(more)行匹配
若存在换行\n并且有开始^或结束$符的情况下，
将以换行为分隔符，逐行进行匹配
$str = "abc\nabc";
$preg = "/^abc$/m";
preg_match($preg, $str,$matchs);
这样其实是符合正则表达式的，因为匹配的时候 先是匹配换行符前面的，接着匹配换行符后面的，两个都是abc所以可以通过正则表达式。

s
特殊字符圆点 . 中包含换行符
默认的圆点 . 是匹配除换行符 \n 之外的任何单字符，加上s之后, .包含换行符
$str = "abggab\nacbs";
$preg = "/b./s";
preg_match_all($preg, $str,$matchs);
这样匹配到的有三个 bg b\n bs

g
全局匹配，查找所有匹配项

A
强制从目标字符串开头匹配;

D
如果使用$限制结尾字符,则不允许结尾有换行; 

e
配合函数preg_replace()使用, 可以把匹配来的字符串当作正则表达式执行; 
```

---

### 弱类型比较

在php中两个等号==是弱类型比较，只需要值相等，不会检测类型是否相同，类型不同时会自动转换

特殊情况：

0exxx类型字符串不管0e后的数字如何，都为0所以可以绕过弱类型比较

如果一个0与一个字符串进行弱类型比较，字符串会被转化为0，最后比较结果为true

---

### strpos()

**strpos() - 查找字符串在另一字符串中第一次出现的位置（区分大小写）**
**stripos() 函数查找字符串在另一字符串中第一次出现的位置（不区分大小写）**
**strrpos() - 查找字符串在另一字符串中最后一次出现的位置（区分大小写）**
**strripos() - 查找字符串在另一字符串中最后一次出现的位置（不区分大小写）**

---

### highlight_file()

`highlight_file()` 函数用于将指定文件的内容以 HTML 格式进行高亮显示，并输出到浏览器。

语法：

```
highlight_file(string $filename, bool $return = false)
```

参数：

- `$filename`：必需，要高亮显示的文件路径。
- `$return`：可选，如果设置为 `true`，则返回高亮显示的文件内容，否则将内容直接输出到浏览器。

返回值： 如果 `$return` 参数设置为 `true`，则返回高亮显示的文件内容；否则没有返回值。

示例：

```
<?phphighlight_file("example.php");?>
```

上述示例将会将名为 `example.php` 的文件内容以 HTML 格式进行高亮显示，并输出到浏览器。

---

### md5()加密函数

[md5函数用法](https://www.runoob.com/php/func-string-md5.html)

md5() 函数计算字符串的 MD5 散列。

md5() 函数使用 RSA 数据安全，包括 MD5 报文摘要算法。

来自 RFC 1321 的解释 -  MD5 报文摘要算法：*MD5 报文摘要算法将任意长度的信息作为输入值，并将其换算成一个 128  位长度的"指纹信息"或"报文摘要"值来代表这个输入值，并以换算后的值作为结果。MD5  算法主要是为数字签名应用程序而设计的；在这个数字签名应用程序中，较大的文件将在加密（这里的加密过程是通过在一个密码系统下[如：RSA]的公开密钥下设置私有密钥而完成的）之前以一种安全的方式进行压缩。*

如需计算文件的 MD5 散列，请使用 [md5_file()](https://www.runoob.com/php/func-string-md5-file.html) 函数。

**md5() 函数不能处理数组，数组都返回 null，md5(a[])  结果为 null。**

#### md5弱类型比较

**题目一：**

**一个字符串与[md5加密](https://so.csdn.net/so/search?q=md5加密&spm=1001.2101.3001.7020)后的值相等**

```
if($md5 == md5($md5))
```

特性：0exxx类型字符串在php弱类型比较中的值都为0

题目要求一个字符串与[md5加密](https://so.csdn.net/so/search?q=md5加密&spm=1001.2101.3001.7020)后的值相等，通过上面PHP 0e漏洞的原理，也就将此题转化成 ==>寻找一个字符串（0e开头）加密后（还是0e开头），弱比较相等。

```
特殊值
0e215962017

echo md5('0e215962017');

#0e291242476940776845150308577824
```

---

题目二：

**两个字符串md5后进行弱类型比较相等**

```
<?php
header("Content-Type:text/html;charset=utf-8");
show_source(__FILE__);
include('flag.php');
$username = $_GET['username'];
$password = $_GET['password'];
if($username != $password){
    if(md5($username) == md5($password)){
        echo 'GET_FLAG：'.$flag;
    }else{
        echo 'md5校验出错...';
    }
}else{
    echo '用户名密码不能相等！';
}
?> 用户名密码不能相等
```

题目中，要求两个字符串值不能相等，但是两个字符串经过md5加密后的值需要相等，通过上面PHP 0e漏洞的原理，也就将此题转化成 ==> 寻找两个值加密后以0e开头，且0e后面是纯数字的字符串即可，

```
240610708 
0e462097431906509019562988736854
 
314282422 
0e990995504821699494520356953734
 
571579406 
0e972379832854295224118025748221

QLTHNDT 
0e405967825401955372549139051580
 
QNKCDZO 
0e830400451993494058024219903391
 
EEIZDOI 
0e782601363539291779881938479162
 
TUFEPMC 
0e839407194569345277863905212547
 
UTIPEZQ 
0e382098788231234954670291303879
```

---

题目三：

```
if (isset($md5) && $md5 == md5($md5)) {
    echo "ezez" . "<br>";
} else {
    die("什么情况,这么基础的md5做不来");
}
```

要求变量md5在经过md5()函数加密之后的值与其本身弱类型比较相等

原理与上题相同，也是0e漏洞，找到一个0e开头后面纯数字的字符串，并且这串字符串在md5加密后依然是0e加纯数字的形式

payload：

```
0e215962017
0e291242476940776845150308577824

0e1137126905
0e291659922323405260514742049229
```

#### md5强类型比较

题目：

```
<?php
header("Content-Type:text/html;charset=utf-8");
show_source(__FILE__);
include('flag.php');
$username = $_GET['username'];
$password = $_GET['password'];
if($username != $password){
    if(md5($username) === md5($password)){
        echo 'GET_FLAG：'.$flag;
    }else{
        echo 'md5校验出错...';
    }
}else{
    echo '用户名密码不能相等！';
}
?> 用户名密码不能相等！

```

全等运算符“===”，既比较值又比较类型，题目中“!=”意思为“不等于”，具体可查看菜鸟教程关于“!=”说明，值不相等时返回“ture”，也就是说两个参数值要不相等，两个参数在md5加密后全相等，也就是说两个参数在md5加密后不仅值相等类型也要一致，此时就无法利用PHP 0e漏洞了，需要别的方法绕过。可以利用md5在加密字符串时会warining，输出结果为NULL，传入两个数组，这样就能使两个参数在md5加密后的类型是一致的。

payload:?username[]=1&password[]=2

#### md5强碰撞（绕过强类型比较）

两个字符串不同，但是md5加密后的值相同，这就是md5碰撞，可以通过工具生成，这里有两个例子，可以用来绕过强类型比较

```
a=M%C9h%FF%0E%E3%5C%20%95r%D4w%7Br%15%87%D3o%A7%B2%1B%DCV%B7J%3D%C0x%3E%7B%95%18%AF%BF%A2%00%A8%28K%F3n%8EKU%B3_Bu%93%D8Igm%A0%D1U%5D%83%60%FB_%07%FE%A2
&b=M%C9h%FF%0E%E3%5C%20%95r%D4w%7Br%15%87%D3o%A7%B2%1B%DCV%B7J%3D%C0x%3E%7B%95%18%AF%BF%A2%02%A8%28K%F3n%8EKU%B3_Bu%93%D8Igm%A0%D1%D5%5D%83%60%FB_%07%FE%A2

a=%4d%c9%68%ff%0e%e3%5c%20%95%72%d4%77%7b%72%15%87%d3%6f%a7%b2%1b%dc%56%b7%4a%3d%c0%78%3e%7b%95%18%af%bf%a2%00%a8%28%4b%f3%6e%8e%4b%55%b3%5f%42%75%93%d8%49%67%6d%a0%d1%55%5d%83%60%fb%5f%07%fe%a2
&b=%4d%c9%68%ff%0e%e3%5c%20%95%72%d4%77%7b%72%15%87%d3%6f%a7%b2%1b%dc%56%b7%4a%3d%c0%78%3e%7b%95%18%af%bf%a2%02%a8%28%4b%f3%6e%8e%4b%55%b3%5f%42%75%93%d8%49%67%6d%a0%d1%d5%5d%83%60%fb%5f%07%fe%a2
```

#### 算数运算配合自动类型转换

md5()遇到算数符时，会先运算，再计算结果的md5值

所以，当字符串与数字类型运算时，会将字符串转换成数字类型再参与运算，最后计算运算结果的MD5值

```
echo md5(3).PHP_EOL;
echo md5('2' + 1).PHP_EOL;

#eccbc87e4b5ce2fe28308fd9f2a7baf3
#eccbc87e4b5ce2fe28308fd9f2a7baf3
```

#### 双重md5加密

经过双重md5加密后为0e开头且0e后只有数字的字符串

```
179122048 -> 30c14e38d72a2203bc0bdd2ced6484e6 -> 0e983430692806892134340492059275

421525751 -> 0e834768210109958574832452736235 -> 0e834768210109958574832452736235

f2WfQ -> a23852368ce75a6da8b3e898ff1f21f4 -> 0e997766059721689977306698103413
```

---

### 引用

**&符号的利用**

感觉有点像c里的取地址符，指针

比如：

```
class test{
	var $enter;
	var $secret;
}


$a = new test();
$a->enter = &$a->secret;
```

这里就相当于a对象中的成员属性enter的值引用了a对象中成员属性secret的值，所以当secret的值改变的时候，enter依然与enter相同

---

### in_array()

[in_array()用法](https://www.php.net/manual/zh/function.in-array.php)

in_array()函数搜索数组中是否存在指定的值。

语法：`in_array(search,array,type)`

```
参数					描述
search		必需。规定要在数组搜索的值
array		必需。规定要搜索的数组
type		可选，如果设置该参数为true，则检查搜索的数据与数组的值的类型是否相同
```

**type ： 类型，true全等 ，false非全等（默认）**

---

### file_put_contents()

[file_put_contents()用法](https://www.php.net/manual/zh/function.file-put-contents.php)

- 该函数访问文件时，遵循以下规则：
- 如果设置了 FILE_USE_INCLUDE_PATH，那么将检查 filename 副本的内置路径
- 如果文件不存在，将创建一个文件
- 打开文件
- 如果设置了 LOCK_EX，那么将锁定文件
- 如果设置了 FILE_APPEND，那么将移至文件末尾。否则，将会清除文件的内容
- 向文件中写入数据
- 
- 关闭文件并对所有文件解锁
- 如果成功，该函数将返回写入文件中的字符数。如果失败，则返回 False。

```
int file_put_contents ( string $filename , mixed $data [, int $flags = 0 [, resource $context ]] )

filename： 必需。规定要写入数据的文件。 如果文件不存在，则创建一个新文件。
data： 必需。规定要写入文件的数据。可以是字符串、数组或数据流。
```

---

### 逻辑运算符优先级

[逻辑运算符详解](https://www.runoob.com/php/php-operators.html)

"&&" > "||" > "=" > "and"

---

### is_numeric()

[is_numeric函数详解](https://www.php.net/manual/zh/function.is-numeric.php)

用于检测变量是否为数字或数字字符串。
 如果指定的变量是数字和数字字符串则返回 TRUE，否则返回 FALSE

```
is_numeric(mixed $value): bool
```

参数

- `value` 需要检测的变量。             

返回值

- 如果 `value` 是数字或数字字符串，    返回 **`true`**，否则返回 **`false`**。   

---

### ReflectionClass反射类

**PHP Reflection API是PHP5才有的新功能，它是用来导出或提取出关于类、方法、属性、参数等的详细信息，包括注释。**

反射类可以说成是类的一个映射，可以利用反射类来代替有关类的应用的任何语句

```
<?php
class A{
public static $flag="flag{123123123}";
const  PI=3.14;
static function hello(){
    echo "hello</br>";
}
}

/有这么一个A类，假设我们不知道这个类是干什么用的，我们需要知道类里面的信息，这时候就需要用到ReflectionClass来对类进行反射
//现在我可以通过反射来获取这个类中的方法，属性，常量

$a=new ReflectionClass('A');	//实例化反射对象,映射A类的信息


var_dump($a->getConstants());  获取一组常量
输出
 array(1) {
  ["PI"]=>
  float(3.14)
}

var_dump($a->getName());    获取类名
输出
string(1) "A"

var_dump($a->getStaticProperties()); 获取静态属性
输出
array(1) {
  ["flag"]=>
  string(15) "flag{123123123}"
}

var_dump($a->getMethods()); 获取类中的方法
输出
array(1) {
  [0]=>
  object(ReflectionMethod)#2 (2) {
    ["name"]=>
    string(5) "hello"
    ["class"]=>
    string(1) "A"
  }
  
 
  var_dump($a->getProperties());	  //获取所有属性

}
```

---

### call_user_func()

[call_user_func函数具体详解](https://www.php.net/manual/zh/function.call-user-func.php)

`call_user_func($callback, parameter)`：调用函数，第一个参数为被调用的函数，第二个参数为被调用函数所需的参数；

第一个参数是必须的，第二个参数可选

call_user_func支持传入数组，且可以用数组来调用静态方法

例如：

```
<?php
class a{
    static public function test(){
        echo 'flag';
    }
}

$ans[0] = 'a';
$ans[1] = 'test';
call_user_func($ans);

#输出
flag
```



---

### substr()

[substr函数详解](https://www.php.net/manual/zh/function.substr.php)

substr() 可以截取字符串

语法

    string substr( $str, start, length);
     $str ：被截取的字符串。
     start ：开始截取的位置。
     length ：截取的长度。

返回值

截取成功，就返回截取的字符串
start 超过字符串长度，就返回 false
start 和 length 设置成不合理的截取范围，就返回空字符串
substr((xxx),1,1):表示从第1个字母开始，显示1个字母，从1开始计数

---

### hex2bin()

[hex2bin函数详解](https://www.php.net/manual/zh/function.hex2bin.php)

`hex2bin()`：将十六进制字符转化为ASCII码字符。

---

### php伪协议

[CTF之php伪协议以及能使用php伪协议的函数](https://www.cnblogs.com/hithub/p/16299548.html)

---

### sha1()

[sha1详解](https://www.php.net/manual/zh/function.sha1.php)

sha1 — 计算字符串的 sha1 散列

**sha1**(string `$string`, bool `$binary` = **`false`**): 

以字符串形式返回 sha1 散列值。

绕过方法：不能处理数组，而且能构造出0exxxx类型数据，能绕过弱类型比较

---

### 变量覆盖

变量覆盖是把变量的值当作另一个变量的名

例如：

```
$a='b';
$b='c';
echo '$a';		#b
echo '$b';		#c
echo '$$a' 		#c
```

---

### die()

PHP 中的 die() 函数是一个终止脚本执行的函数，它会立即结束当前正在运行的脚本，并可选地输出一条错误信息（可以输出变量）

**用法**

die() 函数的语法如下：

```
die(message)
```

参数 message 是一个可选的字符串，将作为错误信息在脚本终止前显示。如果没有提供错误信息，则不会显示任何内容。

---

### parse_str()

[parse_str函数详解](https://www.runoob.com/php/func-string-parse-str.html)

parse_str() 函数把查询字符串解析到变量中。

**注释：**如果未设置 array 参数，由该函数设置的变量将覆盖已存在的同名变量。

**注释：**php.ini 文件中的 magic_quotes_gpc 设置影响该函数的输出。如果已启用，那么在 parse_str() 解析之前，变量会被 addslashes() 转换。

语法：

parse_str(*string,array*)

| 参数     | 描述                                                       |
| -------- | ---------------------------------------------------------- |
| *string* | 必需。规定要解析的字符串。                                 |
| *array*  | 可选。规定存储变量的数组名称。该参数指示变量存储到数组中。 |

```
<?php
parse_str("name=Peter&age=43",$myArray);
print_r($myArray);
?>


Array ( [name] => Peter [age] => 43 ) 

如果string参数填xxx=后面没有值
则$myArray['xxx']=null
```

---

### ereg()

`ereg()`正则匹配函数，类似`preg_match`，php7.0已删除。`ereg()`存在%00截断漏洞，也就是说在字符串中遇到%00，php解析器会认为字符串结束了。**而且截断之后，%00后面的值会重新赋值给原来的变量。**

---

### strrev()

strrev() ：反转字符串

---

### PHP原生类

[php原生类总结](https://blog.csdn.net/weixin_54902210/article/details/124689580)

---

### __toString()魔术方法

将一个对象作为字符串使用时（`echo <一个对象>`），php会自动调用该对象的 `__toString()`方法来获取[字符串表示](https://so.csdn.net/so/search?q=字符串表示&spm=1001.2101.3001.7020)。注意，`__toString()`方法在对象被隐式转换为字符串时（`echo <一个对象>`）才会触发，如果直接调用该方法，不会有任何效果。

```
<?php
class MyClass{
	private $name;
	
	public function __construct($name){
		$this->name = $name
	}
	
	public function __toString(){
		return "Object name:".$this->name
	}
}

$obj = new Myclass("My Object");

echo $obj; // 输出对象的字符串表示，自动调用__toString()方法
?>

输出
Object name:My Object
```

**php中，自带 `__toString()`方法的内置类有：`DataTime`、`Exception`、`SimpleXMLElement`。**

---

### php超全局变量

[php超级全局变量详解](https://www.runoob.com/php/php-superglobals.html)

---

### php伪协议（filter）

php://filter是php中的伪协议主要用于在输入和输出流上应用过滤器。基本语法是：php://filter/<filter>/resource，其中<filter>是要应用的过滤器名称，resource是要过滤的资源。

    过滤读取的数据
    //先读取flag.php的内容，再进行base64编码，也就是说以后呈现的内容是经过base64编码后的内容。
    file_get_contents('php://filter/write=convert.base64-encode/resource=flag.php'） 
    
    过滤写入的数据
    // 先将字符串hello world进行base64编码，再写入flag.php文件中，写的时候是先进行base64解码，再写。也就是说在写的时候，先执行php://filter/write=convert.base64-decode对字符串进行解码。
    $data='hello world';
    file_put_contents('php://filter/write=convert.base64-decode/resource=flag.php'，base64($data))

---

### trim()

```swift
语法
trim(string,charlist)

参数	描述
string	        必需。规定要检查的字符串。
charlist	    可选。规定从字符串中删除哪些字符。如果省略该参数，则移除下列所有字符：
                "\0"       - NULL
                "\t"       - 制表符
                "\n"       - 换行
                "\x0B"     - 垂直制表符
                "\r"       - 回车
                " "        - 空格
```

---

### GET/POST传递变量特性（[）

在php中变量名字是由数字字母和下划线组成的，所以不论用post还是get传入变量名的时候都将空格、[，+、点转换为下划线，而传入[之后后面的空格、[，+、点就不会被转为下划线了

---

### $_SERVER[]

**$_SERVER[] 是PHP中一个预定义的超全局数组，用于存储服务器环境、请求头信息、脚本路径等与HTTP请求和服务器配置相关的数据。以下是对其核心功能、常用参数及安全注意事项的详细解析：**

**一、核心特性与作用**
**超全局性 $_SERVER 在所有脚本作用域中自动生效，无需使用 global 声明即可访问。其内容由Web服务器生成，不同服务器（如Apache、Nginx）可能提供的信息存在差异。**

**数据类型与范围**

**包含字符串键值对，如 $_SERVER['REMOTE_ADDR'] 表示客户端IP地址。**
**涵盖服务器软件版本、请求方法、脚本路径、HTTP头信息等 。**
**与 $HTTP_SERVER_VARS 的区别**

**$HTTP_SERVER_VARS 是旧版全局变量，需手动声明作用域（如 global），而 $_SERVER 是自动全局变量。
在PHP 4.1.0+版本中，推荐使用 $_SERVER 。**

- 二、常用参数与用途
- 参数	描述	示例值
- $_SERVER['PHP_SELF']	当前执行脚本的文件名（相对于文档根目录）。常用于表单自提交场景。	/index.php
- $_SERVER['REQUEST_METHOD']	请求方法（GET、POST、PUT等）。用于判断请求类型。	GET
- $_SERVER['REMOTE_ADDR']	客户端IP地址。注意可能受代理影响，需结合 HTTP_X_FORWARDED_FOR 分析。	192.168.1.100
- $_SERVER['HTTP_USER_AGENT']	客户端浏览器和操作系统信息。常用于设备检测或日志记录。	Mozilla/5.0 (Windows NT 10.0...)
- $_SERVER['DOCUMENT_ROOT']	服务器文档根目录绝对路径。用于文件操作或路径拼接。	/var/www/html
- $_SERVER['SCRIPT_FILENAME']	当前脚本的绝对路径。与 __FILE__ 常量等价。	/var/www/html/index.php
- $_SERVER['HTTP_REFERER']	用户访问当前页的前一页URL。可能为空或被伪造，需谨慎验证。	https://www.google.com
- $_SERVER['HTTPS']	是否通过HTTPS访问（值为 on 或 off）。用于判断协议安全性。	on
- $_SERVER['QUERY_STRING']	URL中的查询字符串（?后的部分）。常用于参数解析。	id=123&name=test



---

### assert()

**相当于eval()，也是危险函数，他能将其中的字符串当做php代码来执行，且assert不需要严格遵从语法，比如末尾的分号可以不加。**

---

### extract()

PHP extract()函数从[数组](https://baike.baidu.com/item/数组/0?fromModule=lemma_inlink)中把[变量](https://baike.baidu.com/item/变量/0?fromModule=lemma_inlink)导入到当前的[符号表](https://baike.baidu.com/item/符号表/0?fromModule=lemma_inlink)中。 

对于数组中的每个元素，键名用于变量名，键值用于[变量值](https://baike.baidu.com/item/变量值/8414141?fromModule=lemma_inlink)。

第二个参数 type 用于指定当某个变量已经存在，而数组中又有同名元素时，extract()函数如何对待这样的冲突。

本函数返回成功设置的变量数目。

```
语法：
extract(array,extract_rules,prefix)

例子
$my_array = array("a" => "Cat","b" => "Dog", "c" => "Horse");
extract($my_array);
echo "\$a = $a; \$b = $b; \$c = $c";?>
输出：
$a = Cat; $b = Dog; $c = Horse
```

---

### $_SERVER['QUERY_STRING']

https://blog.csdn.net/qq_49480008/article/details/115872899

`$_SERVER['QUERY_STRING']`获取的是GET传参数据（`?`后面的键值）

```
例如：
?ctf_show=123

$a = $_SERVER['QUERY_STRING'];
echo $a;

输出
'ctf_show=123'
```

---

### gettext

**_() 函数即 gettext() 函数，可以将参数翻译成指定语言，一般就是原封不动的输出参数**

**string gettext( string $message) 返回输入的字符**
**_()==gettext() 是gettext()的拓展函数，开启text扩展，_是gettext的别名。需要php扩展目录下有php_gettext.dll**

**echo gettext("Welcome to My PHP Application");**

---

### get_defined_vars()

**get_defined_vars — 返回由所有已定义变量所组成的数组**

---

### stripos()

stripos

注意：如果参数为数组，直接输出null

```
stripos 
(PHP 5, PHP 7)
stripos — 查找字符串首次出现的位置（不区分大小写）
说明 
mixed stripos( string $haystack, string $needle[, int $offset = 0] )
返回在字符串 haystack 中 needle 首次出现的数字位置。 
与 strpos() 不同，stripos() 不区分大小写。 


参数 
haystack
在该字符串中查找。 
needle
注意 needle 可以是一个单字符或者多字符的字符串。 
如果 needle 不是一个字符串，那么它将被转换为整型并被视为字符顺序值。 
offset
可选的 offset 参数，从字符此数量的开始位置进行搜索。如果是负数，就从字符末尾此数量的字符数开始统计。 

返回值 
返回 needle 存在于 haystack 字符串开始的位置(独立于偏移量)。同时注意字符串位置起始于 0，而不是 1。 
如果未发现 needle 将返回 FALSE。 
```

---

### readfile()

readfile

```
readfile(string $filename, bool $use_include_path = false, resource $context = ?): int
 读取文件并写入到输出缓冲。 
 
参数
filename
    要读取的文件名。
use_include_path
    想要在 include_path 中搜索文件，可使用这个可选的第二个参数，设为 true。
context
    Stream 上下文（context） resource。
返回值
成功时返回从文件中读入的字节数， 或者在失败时返回 false
```

---

### php伪协议嵌套无效协议

php伪协议在遇到无效协议时，会自动忽略。

当我们的伪协议中需要包含一些内容，但又不影响我们的读取，就可以使用这种方法

例如：

```
?f=php://filter/read=convert.base64-encode|ctfshow/resource=flag.php
?f=php://filter/|ctfshow/resource=flag.php
```

---

### 目录穿越

[目录穿越详解](https://www.cnblogs.com/milantgh/p/3756726.html)

---

### PCRE回溯次数绕过

1.正则最大回溯次数绕过
 PHP 为了防止正则表达式的拒绝服务攻击（reDOS），给 pcre 设定了一个回溯次数上限 pcre.backtrack_limit
 回溯次数上限默认是 100 万。如果回溯次数超过了 100 万，preg_match 将不再返回非 1 和 0，而是 false。这样我们就可以绕过第一个正则表达式了。

python脚本

```python
import requests
url=""
data={'f':'very'*250000+'ctfshow' } r=requests.post(url,data=data)
print(r.text)
```

---

### exec()

**`exec(string $command, array &$output = ?, int &$return_var = ?): string`**

```php
exec() 执行 command 参数所指定的命令。
例：
<?php
// 输出运行中的 php/httpd 进程的创建者用户名
// （在可以执行 "whoami" 命令的系统上）
echo exec('whoami');
?>
```

---

### tee（linux）

tee命令是Linux中常用的命令。这是一个简单但功能强大的命令，用于读取标准输入，然后将其写入文件以及标准输出。

下是 tee 命令的一些最常用选项 -

```dos
-a, --append
```

此选项将标准输入附加到指定文件的末尾而不是覆盖它们。

```sql
-i, --ignore-interrupts
```

该选项忽略中断信号（如Ctrl+C）并继续运行。

```sql
-p, --output-error
```

此选项可防止 tee 命令因写入错误而退出。

```dos
--help
```

此选项显示 tee 命令的帮助消息。

```sql
--version
```

此选项显示 tee 命令的版本号。

**常用功能：**

**将标准输入写入文件：**

```
$ echo "Hello,world!" | tee hello.txt

这里是将语句写入到文件中
```

**将标准输入附加到文件：**

```
$ echo "Hello,world again!" | tee -a hello.txt

将语句追加到文件中
```

---

### 类的静态方法的调用

**语法：类+::+方法名**

```
->与::调用函数的区别：
-> 调用实例方法
:: 调用静态方法
在类里面的时候，$this->func()和self::func()没什么区别。
在外部的时候，->必须是实例化后的对象使用；而::可以是未实例化的类名直接调用。
```

类的静态方法还可以使用数组形式来调用

```
Closure::fromCallable($b)

这部分看起来像是一个静态方法调用，但实际上它利用了 PHP 的可调用值（callable）特性。PHP 允许数组作为可调用对象，格式为 [类名或对象, 方法名]。

所以 $b 数组在这里被解释为 ['Closure', 'fromCallable']，这意味着调用 Closure 类的 fromCallable 静态方法。
```

例如：

```
例如
<?php


$b[0]='Closure';
$b[1]='fromCallable';

$b('system')('whoami');
```

---

### strripos()

**strripos — 计算指定字符串在目标字符串中最后一次出现的位置（不区分大小写）**

```php
strripos(string $haystack, string $needle, int $offset = 0): int
以不区分大小写的方式查找指定字符串在目标字符串中最后一次出现的位置。与 strrpos() 不同，strripos() 不区分大小写。 

haystack
    在此字符串中进行查找。
needle
    注意 needle 可以是一个单字符或者多字符的字符串。
offset
    参数 offset 可以被指定来查找字符串中任意长度的子字符串。
    负数偏移量将使得查找从字符串的起始位置开始，到 offset 位置为止。
   
返回 needle 相对于 haystack 字符串的位置(和搜索的方向和偏移量无关)。同时注意字符串的起始位置为0而非1。
如果 needle 未被发现，返回 false。 
```

---

### 无字母数字命令执行

yu22x的关于绕过正则表达式的文章：

[无字母数字命令执行绕过正则总结包括各种绕过脚本](https://blog.csdn.net/miuzzx/article/details/109143413)

---

### create_function（）

create_function()

```undefined
create_function的第一个参数是参数，第二个参数是内容。

create_function('$a','return 123')

类似于：
function f($a) {
  return 123;
}

如果我们第二个参数传入 echo 1;}phpinfo();//
function f($a) {
  echo 1;}phpinfo();//
}
可以执行phpinfo()命令
```

---

### PHP请求头特性

PHP将请求头转换为`$_SERVER`数组时，会添加`HTTP_`前缀并且将字段名中的连字符也就是（-）转换为下划线（例如`User-Agent`转换为`HTTP_USER_AGENT`）。但是注意如果原字段名本身包含下划线，会导致解析失败。

Nginx默认限制：

Nginx默认忽略带下划线的请求头字段（如`X_Custom_Header`）,除非显式开启`underscores_in_headers on`配置

例如：如果要使`['HTTP_LOVE_CTF']==='TRUE'`

```
添加header
LOVE-CTF: TRUE
```





