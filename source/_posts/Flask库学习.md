---
title: Flask库学习
date: 2025-03-23 16:10:30
tags:
- Flask
category:
- 学习笔记
---

 Flask是一个非常小的PythonWeb框架，被称为微型框架；只提供了一个稳健的核心，其他功能全部是通过扩展实现的；意思就是我们可以根据项目的需要量身定制，也意味着我们需要学习各种扩展库的使用。

## 基本概念

### 创建

通过创建路由并关联函数，实现一个基本的网页

```
from flask import Flask

# 用当前脚本名称实例化Flask对象，方便flask从该脚本文件中获取需要的内容
app = Flask(__name__)

#程序实例需要知道每个url请求所对应的运行代码是谁。
#所以程序中必须要创建一个url请求地址到python运行函数的一个映射。
#处理url和视图函数之间的关系的程序就是"路由"，在Flask中，路由是通过@app.route装饰器(以@开头)来表示的
@app.route("/")
#url映射的函数，要传参则在上述route（路由）中添加参数申明
def index():
    return "Hello World!"

# 直属的第一个作为视图函数被绑定，第二个就是普通函数
# 路由与视图函数需要一一对应
# def not():
#     return "Not Hello World!"

# 启动一个本地开发服务器，激活该网页
app.run()
```

- **@app.route('/')**： 这是一个装饰器，用于告诉 Flask 哪个 URL 应该触发下面的函数。在这个例子中，它指定了根 URL（即网站的主页）。

也可以@app.route('/admin')/@app.route('/admin/admin2')...

### 传参

```
#传参：<变量名>
#也可以定义特定的数据类型:<int:变量名>
#若传入的是double或str型的则显示not found

路由规则支持不同类型的参数和匹配规则。

类型规则：

    字符串（默认）： 匹配任意字符串。
    整数（<int:name>）： 匹配整数值。
    浮点数（<float:value>）： 匹配浮点数值。
    路径（<path:name>）： 匹配任意字符，包括斜杠 /。
    
    
@app.route('/blog/<name>')
def blog(name):
    return f"hello {name}"
```

### 请求对象

请求对象包含了客户端发送的请求信息，包括请求方法、URL、请求头、表单数据等。Flask 提供了 request 对象来访问这些信息。

```
from flask import request

@app.route('/submit', methods=['POST'])
def submit():
    username = request.form.get('username')
    return f'Hello, {username}!'
```

request.form.get('username')：获取 POST 请求中表单数据的 username 字段。

### 响应对象

响应对象包含了发送给客户端的响应信息，包括状态码、响应头和响应体。Flask 默认会将字符串、HTML 直接作为响应体。

```
from flask import make_response

@app.route('/custom_response')
def custom_response():
  response = make_response('This is a custom response!')
  response.headers['X-Custom-Header'] = 'Value'
  return response
```

**make_response**：创建一个自定义响应对象，并设置响应头 X-Custom-Header。

## 模板

### 普通传参

Flask 使用 Jinja2 模板引擎来渲染 HTML 模板。模板允许你将 Python 代码嵌入到 HTML 中，从而动态生成网页内容。

这些html文件都在templates文件夹中

```
from flask import render_template
//注意导入render_template

@app.route('/hello/<name>')
def hello(name):
    return render_template('hello.html', name=name)//html文件也是可以传参数的
```

模板文件hello.html

//模板文件接受py文件传入的参数需用`{{}}`包裹

```
<!DOCTYPE html>
<html>
<head>
    <title>Hello</title>
</head>
<body>
    <h1>Hello, {{ name }}!</h1>
</body>
</html>
```

### 类与字典的传参

py文件

```
from flask import Flask,render_template
app = Flask(__name__)
/类
class student:
    def __init__(self,name,age):
        self.name = name
        self.age = age
@app.route("/")
def index():
/字典
    person = {
        "x": "xxx", "y": "yyy"
    }
    stu = student(name="fmx",age="18")
    return render_template("moban_3.html",stu=stu,person=person)
if __name__=="__main__":
    app.run(debug=True)
```

moban_3文件

```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>fmx</title>
</head>
<body>
<h1>你的姓名是{{stu.name}},年龄是{{stu.age}}</h1>
<h1>字典可以这样{{person["x"]}}，也可以这样{{person.y}}</h1>
</body>
</html>
```

### 模板继承

模板继承允许你创建一个基础模板，然后在其他模板中继承和扩展这个基础模板，避免重复的 HTML 代码。

**创建基础模板**：

在 templates 文件夹中创建一个基础模板 base.html。

templates/base.html 示例：

```
<!DOCTYPE html>
<html>
<head>
    <title>{% block title %}My Website{% endblock %}</title>
</head>
<body>
    <header>
        <h1>My Website</h1>
    </header>
    <main>
        {% block content %}{% endblock %}
    </main>
    <footer>
        <p>Footer content</p>
    </footer>
</body>
</html>
```

**{% block title %}{% endblock %}** 和 **{% block content %}{% endblock %}** 是定义的可替换区域。

**创建子模板**：在 templates 文件夹中创建一个子模板 index.html，继承 base.html。

templates/index.html 文件代码：

```
#{% extends "base.html" %} //开头继承

#{% block title %}Home Page{% endblock %} //自定义区域

{% block content %}
<h2>Welcome to the Home Page!</h2>
<p>Content goes here.</p>
{% endblock %}
```

**\{% extends "base.html" %}**：继承基础模板。

**{% block title %} 和 {% block content %}**：重写基础模板中的块内容。

## 控制结构

### 条件语句

```
{% if user %}
    <p>Welcome, {{ user }}!</p>
{% else %}
    <p>Please log in.</p>
{% endif %}
```

**{% if user %}**：检查 user 变量是否存在，如果存在，则显示欢迎消息，否则显示登录提示。

循环语句：

### 循环语句

```
<ul>
{% for item in items %}
    <li>{{ item }}</li>
{% endfor %}
</ul>
```

**{% for item in items %}**：遍历 items 列表，并为每个项生成一个 <li> 元素。

## 过滤器

### 自定义过滤器

```
from flask import Flask,render_template
from datetime import datetime
app = Flask(__name__)

#自定义过滤器
def time(value,fomat="%Y-%d-%m %H:%M"):
    return value.strftime(fomat)#VALUE是传入的值
app.add_template_filter(time,"time")#后面这个time是过滤器的名字

@app.route("/")
def index():
    username="qazwsx"
    timenow=datetime.now()
    return render_template("moban_guolv.html",username=username,timenow=timenow)

if __name__=="__main__":
    app.run(debug=True)
```

### 原有过滤器

直接在模板文件中使用即可

有很多，用的时候直接查

关键字符：`|`

```
<p>{{ name|capitalize }}</p>
<p>{{ price|round(2) }}</p>
```

**{{ name|capitalize }}**：将 name 变量的值首字母大写。

**{{ price|round(2) }}**：将 price 变量的值四舍五入到小数点后两位。

## 静态文件访问

py文件

```
from flask import Flask, render_template
app = Flask(__name__)
@app.route("/")
def st():
    return render_template("static.html")
if __name__=="__main__":
    app.run(debug=True)
```

static.html文件

```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Title</title>
</head>
<body>
<!--访问图片-->
<img src="static/images/124691006_p0_master1200.jpg">
<!--访问css文件-->
<link rel="stylesheet" href="static/CSS/static.css">
</body>
</html>
```



## 表单处理

示例表单文件

```
<!DOCTYPE html>
<html>
<head>
    <title>Form Example</title>
</head>
<body>
    <form action="/submit" method="post">
        <label for="name">Name:</label>
        <input type="text" id="name" name="name">
        <br>
        <label for="email">Email:</label>
        <input type="email" id="email" name="email">
        <br>
        <input type="submit" value="Submit">
    </form>
</body>
</html>
```

处理表单数据

```
// from flask import Flask, render_template, request

app = Flask(__name__)

@app.route('/')
def form():
    return render_template('form.html')

@app.route('/submit', methods=['POST'])
def submit():
    name = request.form.get('name')
    email = request.form.get('email')
    return f'Name: {name}, Email: {email}'

if __name__ == '__main__':
    app.run(debug=True)
```

**request.form.get('name')** 和 **request.form.get('email')**：获取提交的表单数据。



### **文件上传表单**

Flask 还支持处理文件上传。上传的文件可以通过 request.files 访问。

创建文件上传表单

templates/upload.html 文件代码：

```
<!DOCTYPE html>
<html>
<head>
    <title>Upload File</title>
</head>
<body>
    <form action="/upload" method="post" enctype="multipart/form-data">
        <label for="file">File:</label>
        <input type="file" id="file" name="file">
        <br>
        <input type="submit" value="Upload">
    </form>
</body>
</html>
```

enctype="multipart/form-data"：指定表单数据的编码类型，支持文件上传。

**处理文件上传**

app.py 文件代码：

```
from flask import Flask, request, redirect, url_for

app = Flask(__name__)
app.secret_key = 'your_secret_key'

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files.get('file')
    if file:
        filename = file.filename
        file.save(f'uploads/{filename}')
        return f'File uploaded successfully: {filename}'
    return 'No file uploaded'

if __name__ == '__main__':
    app.run(debug=True)
```

request.files.get('file')：获取上传的文件对象。

file.save(f'uploads/{filename}')：将文件保存到指定目录。

## 数据库操作

SQLAlchemy：SQLAlchemy 是一个强大的 ORM 库，可以简化数据库操作，通过 Python 对象与数据库表进行交互。

Flask-SQLAlchemy 是:Flask 的一个扩展，用于集成 SQLAlchemy。

**db.session.execute()：执行原始 SQL 查询。**

### 数据库配置

```
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# 创建 Flask 应用
app = Flask(__name__)

# 数据库配置
HOSTNAME = "127.0.0.1"  # 主机名
PORT = 3306  # 端口号
USERNAME = "python"  # 用户名
PASSWORD = "123456"  # 密码
DATABASE = "python"  # 数据库名

# 配置数据库 URI
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{USERNAME}:{PASSWORD}@{HOSTNAME}:{PORT}/{DATABASE}?charset=utf8"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # 关闭 SQLAlchemy 的修改跟踪

# 初始化 SQLAlchemy
db = SQLAlchemy(app)

```

### 测试数据库连接

```
with app.app_context():
    with db.engine.connect() as conn:
        rs = conn.execute(text("SELECT 1"))
        result = rs.fetchone()
        print(result)
```

### 定义模型

模型是数据库表的 Python 类，每个模型类代表数据库中的一张表。

Flask-SQLALchemy的ORM框架便可以实现将操作数据库转变为操作对象，一个user表被抽象成了一个user类，

一个表中的id、name、password字段被抽象成一个类的四个属性，

 而该表的一条数据记录就抽象成该类的一个实例化对象，不用再写烦琐的底层SQL语句了

```
class User(db.Model):
    __tablename__ = "user"
    
    id = db.Column(db.Integer, primary_key=True,autoincrement=True)
    
    name = db.Column(db.String(50), nullable=False)
    
    password = db.Column(db.String(50), nullable=False)
    
    def __init__(self, name, password):
        self.name = name
        self.password = password
```

**db.Model**：所有模型类需要继承自 db.Model。

**db.Column**：定义模型的字段，指定字段的类型、是否为主键、是否唯一、是否可以为空等属性。

### 创建和管理数据库

```
在定义了模型后，你可以使用 SQLAlchemy 提供的方法来创建数据库和表。

with app.app_context():
    db.create_all()
db.create_all()：创建所有在当前上下文中定义的模型对应的表。
app.app_context()：扫视上下文，获取全局文件
```

### CRUD

#### 创建数据

```
@app.route('/add_user')
def add_user():
    new_user = User(username='john_doe', email='john@example.com')
    db.session.add(new_user)
    db.session.commit()
    return 'User added!'
```

**db.session.add(new_user)**：将新用户对象添加到会话中。

**db.session.commit()**：提交事务，将更改保存到数据库。

注意：db.session.add不能同时添加多个数据

需逐个添加，或遍历

#### 查询数据

```
@app.route('/check')
def check():
    users = User.query.all()  # 获取所有用户
    return '<br>'.join([f'{user.name} ({user.password})' for user in users])
#或者使用filter_by查找，通过查找字段值返回一个类数组对象
#user=User.query.filter_by(name="小明")
#for user in user：
#   print(user.name)
```

#### 修改数据

```
@app.route('/update/<int:user_id>,<string:name>')
def update_user(user_id, name):
    user = User.query.get(user_id)#通过主键获取单个用户记录
    if user:
        user.name = name
        db.session.commit()
        return 'User updated!'
    return 'User not found!'
    //更新字段值并提交事务。
```

#### 删除数据

```
@app.route('/delete/<int:id>')
def delete_user(id):
    user = User.query.get(id)
    if user:
        db.session.delete(user)
        db.session.commit()
        return 'User deleted!'
    return 'User not found!'
```

**db.session.delete(user)**：删除用户记录，并提交事务。

### Flask-Migrate迁移

三步走

- `flask db init`：初始化迁移环境。
- `flask db migrate -m "message"`：创建迁移脚本。
- `flask db upgrade`：应用迁移到数据库。

## Flask HTTP方法

在python demo.py中插入路由：

```
@app.route('l/login',methods = ['POST','GET'])
def login():
	if request.method == 'POST':
		print(1)
		user = request.form['ben']
		return redirect(url_for('success',name = user))		//redirect重定向到/success/user
	else:
		print(2)
		user = request.args.get('ben')
		return redirect(url_for('success',name = user))
```

---



























