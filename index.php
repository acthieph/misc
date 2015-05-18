<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AKK</title>
    <style>
      header h2 {
        border-top: 1px solid #CCC;
        border-bottom: 3px solid #999;
        display: inline-block; padding: 0 20px;
      }
      ul.list {list-style: none;}
      ul.list li {
        font-size: 1.4rem;
        padding: 6px 0px;
      }
      ul.list li a {
        color: #666;
        text-decoration: none;
        padding-left: 0.5rem;
      }
      ul.list li a:hover {
        color: #333;
        font-weight: bold;
      }
    </style>
</head>
<body>
    <header><h2><?php echo basename(__DIR__) ; ?></h2></header>
    <ul class='list'>
    <?php
      $rootfiles = scandir(__DIR__);

      foreach($rootfiles as $file) {
        if($file[0]==='.') {
          continue;
        }
        if(strpos($file, '.html')) {
          echo '<li><a href="'. $file .'">'.$file.'</a></li>';
        }
      }
    ?>
    </ul>
</body>
</html>
