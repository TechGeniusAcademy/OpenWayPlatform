# 🌐 Настройка DNS для openway.kz

## Проблема
SSL сертификат не устанавливается, потому что домен не указывает на сервер.

## Решение

### 1. Зайдите в панель управления доменом openway.kz

У вашего регистратора домена (например, nic.kz, reg.ru и т.д.)

### 2. Настройте DNS записи:

Добавьте следующие A-записи:

| Тип | Имя | Значение | TTL |
|-----|-----|----------|-----|
| A | @ | 194.110.55.56 | 3600 |
| A | www | 194.110.55.56 | 3600 |

**Где:**
- `@` - это корневой домен (openway.kz)
- `www` - это поддомен (www.openway.kz)
- `194.110.55.56` - IP адрес вашего сервера

### 3. Подождите распространения DNS (5-30 минут)

Проверьте, что DNS настроен:

```bash
# На Windows PowerShell
nslookup openway.kz

# На Linux/Mac
dig openway.kz
host openway.kz
```

**Ожидаемый результат:**
```
openway.kz has address 194.110.55.56
```

### 4. После настройки DNS - установите SSL

На сервере выполните:

```bash
sudo certbot --nginx -d openway.kz -d www.openway.kz
```

Certbot автоматически:
- ✅ Получит SSL сертификат
- ✅ Настроит Nginx для HTTPS
- ✅ Настроит автообновление сертификата

### 5. Переключите Nginx на SSL конфигурацию

```bash
# Отключить HTTP конфиг
sudo rm /etc/nginx/sites-enabled/openway.kz

# Включить HTTPS конфиг
sudo ln -s /etc/nginx/sites-available/openway.kz-ssl /etc/nginx/sites-enabled/

# Проверить конфигурацию
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx
```

## Временное решение (пока DNS не настроен)

Если нужно протестировать сайт до настройки DNS:

### На вашем локальном компьютере (Windows):

1. Откройте PowerShell от имени администратора
2. Выполните:

```powershell
Add-Content -Path C:\Windows\System32\drivers\etc\hosts -Value "194.110.55.56 openway.kz"
Add-Content -Path C:\Windows\System32\drivers\etc\hosts -Value "194.110.55.56 www.openway.kz"
```

3. Откройте браузер и перейдите на http://194.110.55.56

**⚠️ Внимание:** SSL не будет работать с таким решением!

## Проверка после настройки

```bash
# Проверка HTTP (должен редиректить на HTTPS)
curl -I http://openway.kz

# Проверка HTTPS
curl -I https://openway.kz

# Проверка сертификата
openssl s_client -connect openway.kz:443 -servername openway.kz
```

## Частые проблемы

### DNS не обновился
- Подождите 30-60 минут
- Проверьте правильность записей в панели управления доменом
- Очистите DNS кеш: `ipconfig /flushdns` (Windows)

### Certbot всё равно не работает
- Убедитесь, что порты 80 и 443 открыты в firewall
- Проверьте, что Nginx запущен: `sudo systemctl status nginx`
- Проверьте логи: `sudo tail -f /var/log/letsencrypt/letsencrypt.log`

---

**Важно:** Без правильной настройки DNS домен openway.kz не будет работать!
