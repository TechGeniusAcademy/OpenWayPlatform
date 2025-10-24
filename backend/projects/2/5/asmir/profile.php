<?php
require_once "database.php";
session_start();

$db = new Database();

if (!isset($_SESSION["username"])) {
    header("Location: login.php?Нет");
    exit;
}

$user = $db->getUser($_SESSION["username"]);
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
    <title>Profile</title>
</head>

<body>
    <div class="container">
        <div class="profile-container">
            <div class="user-info">
                <div>
                    <p><?= htmlspecialchars($user["username"]) ?></p>
                </div>
                <div>
                    <p><?= htmlspecialchars($user["email"]) ?></p>
                </div>
                <div>
                    <p><?= htmlspecialchars($user["create_at"]) ?></p>
                </div>
            </div>
            <div class="logout-btn">
                <a class="btn" href="logout.php">Выйти</a>
            </div>
        </div>
    </div>
</body>

</html>