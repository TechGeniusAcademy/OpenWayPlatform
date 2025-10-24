<?php
require_once "database.php";
session_start();
$db = new Database();

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $username = $_POST["username"];
    $password = $_POST["password"];

    if (empty($username) || empty($password)) {
        header("Location: login.php?error=Заполните все поля");
        exit;
    }

    $user = $db->login($username, $password);

    if ($user) {
        $_SESSION["id"] = $user["id"];
        $_SESSION["username"] = $user["username"];

        header("Location: profile.php");
        exit;
    } else {
        header("Location: login.php?error=Неверный логин или пароль");
        exit;
    }
}
?>

<!DOCTYPE html>
<html lang="ru">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Orbitron:wght@400..900&family=Rubik:ital,wght@0,300..900;1,300..900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css" integrity="sha512-2SwdPD6INVrV/lHTZbO2nodKhrnDdJK9/kg2XD1r9uGqPo1cUbujc+IYdlYdEErWNu69gVcYgdxlmVmzTWnetw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <link rel="stylesheet" href="auth.css">
    <title>Вход</title>
</head>

<body>
    <div class="container">
        <div class="form-container">
            <div class="form basic">
                <form class="form" method="POST">
                    <h2 style="margin-bottom: 8vh;">Вход</h2>
                    <label><i class="fa-solid fa-user"></i><input type="text" placeholder="Логин" name="username" required></label>
                    <label><i class="fa-solid fa-lock"></i><input type="password" placeholder="Введите пароль" name="password" required></label>
                    <?php
                    if (isset($_GET["error"])):
                    ?>
                        <p class="error-text"><?= $_GET["error"] ?>!</p>
                    <?php endif; ?>
                    <button style="margin-top: 8vh;" type="submit">Войти</button>
                </form>
            </div>
        </div>
    </div>
</body>

</html>