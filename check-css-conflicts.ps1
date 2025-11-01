# Скрипт для поиска конфликтующих CSS классов
$cssFiles = Get-ChildItem -Path "frontend/src" -Filter "*.css" -Recurse

$allClasses = @{}

foreach ($file in $cssFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Находим все селекторы классов
    $matches = [regex]::Matches($content, '\.([a-zA-Z0-9_-]+)\s*\{')
    
    foreach ($match in $matches) {
        $className = $match.Groups[1].Value
        
        # Игнорируем классы которые вложены (начинаются с префикса компонента)
        if ($className -notmatch '^(student|admin|teacher|tester|css-editor)-') {
            if (-not $allClasses.ContainsKey($className)) {
                $allClasses[$className] = @()
            }
            $allClasses[$className] += $file.Name
        }
    }
}

Write-Host "`nChecking for conflicting classes..." -ForegroundColor Yellow

$conflicts = $allClasses.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 } | Sort-Object {$_.Value.Count} -Descending

if ($conflicts) {
    foreach ($conflict in $conflicts | Select-Object -First 20) {
        Write-Host "  .$($conflict.Key)" -ForegroundColor Red -NoNewline
        Write-Host " used in $($conflict.Value.Count) files:" -ForegroundColor Yellow
        $conflict.Value | Select-Object -Unique | ForEach-Object {
            Write-Host "    - $_" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    Write-Host "`nTotal conflicts found: $($conflicts.Count)" -ForegroundColor Yellow
} else {
    Write-Host "No conflicts found! All good!" -ForegroundColor Green
}
