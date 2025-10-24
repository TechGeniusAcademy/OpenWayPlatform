<?php
require_once "database.php";

// Тестовые данные
$_POST['username'] = 'test_user';
$_POST['email'] = 'test@example.com';
$_POST['password'] = 'password123';
$_POST['confirm_password'] = 'password123';
$_SERVER['REQUEST_METHOD'] = 'POST';

// Подключаем register.php
require_once "register.php";
?>