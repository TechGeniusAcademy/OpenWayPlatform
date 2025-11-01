# Script to migrate all CSS files to CSS Modules
param(
    [switch]$DryRun
)

$rootPath = "frontend/src"

Write-Host "Starting CSS Modules migration..." -ForegroundColor Cyan
Write-Host "Root path: $rootPath`n" -ForegroundColor Gray

# Step 1: Find all CSS files (except index.css)
$cssFiles = Get-ChildItem -Path $rootPath -Filter "*.css" -Recurse | Where-Object { 
    $_.Name -ne "index.css" -and 
    $_.Name -notlike "*.module.css" -and
    $_.Directory.Name -ne "styles"
}

Write-Host "Found $($cssFiles.Count) CSS files to convert`n" -ForegroundColor Yellow

foreach ($cssFile in $cssFiles) {
    $relativePath = $cssFile.FullName.Replace((Get-Location).Path + "\", "")
    Write-Host "Processing: $relativePath" -ForegroundColor White
    
    # Get the component name
    $componentName = $cssFile.BaseName
    $directory = $cssFile.DirectoryName
    
    # New module CSS filename
    $newCssName = "$componentName.module.css"
    $newCssPath = Join-Path $directory $newCssName
    
    # Find corresponding JSX/JS file
    $jsxFile = Get-ChildItem -Path $directory -Filter "$componentName.jsx" -ErrorAction SilentlyContinue
    if (-not $jsxFile) {
        $jsxFile = Get-ChildItem -Path $directory -Filter "$componentName.js" -ErrorAction SilentlyContinue
    }
    
    if ($jsxFile) {
        Write-Host "  - Found JSX: $($jsxFile.Name)" -ForegroundColor Green
        
        if (-not $DryRun) {
            # Rename CSS file
            Rename-Item -Path $cssFile.FullName -NewName $newCssName -Force
            Write-Host "    Renamed to: $newCssName" -ForegroundColor Gray
            
            # Update import in JSX file
            $jsxContent = Get-Content $jsxFile.FullName -Raw
            
            # Replace import statement
            $oldImport = "import './\Q$($cssFile.Name)\E';"
            $newImport = "import styles from './$newCssName';"
            
            $jsxContent = $jsxContent -replace "import ['""]\./$($cssFile.Name)['""];", $newImport
            
            # Replace className="xxx" with className={styles.xxx}
            $jsxContent = $jsxContent -replace 'className="([a-zA-Z0-9_-]+)"', 'className={styles.$1}'
            
            # Replace className with template literals for multiple classes
            # className="class1 class2" -> className={`${styles.class1} ${styles.class2}`}
            $jsxContent = $jsxContent -replace 'className=\{styles\.([a-zA-Z0-9_-]+)\s+([a-zA-Z0-9_-]+)\}', 'className={`${styles.$1} ${styles.$2}`}'
            
            # Handle conditional classNames
            # className={`xxx ${condition ? 'yyy' : ''}`} -> className={`${styles.xxx} ${condition ? styles.yyy : ''}`}
            $jsxContent = $jsxContent -replace 'className=\{`([^`$]*)\$\{styles\.([a-zA-Z0-9_-]+)', 'className={`${styles.$1} ${styles.$2'
            
            Set-Content -Path $jsxFile.FullName -Value $jsxContent -NoNewline
            Write-Host "    Updated JSX imports and classNames" -ForegroundColor Gray
        } else {
            Write-Host "    [DRY RUN] Would rename to: $newCssName" -ForegroundColor Yellow
            Write-Host "    [DRY RUN] Would update: $($jsxFile.Name)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  - WARNING: No JSX file found for $componentName" -ForegroundColor Red
    }
    
    Write-Host ""
}

if ($DryRun) {
    Write-Host "`nDRY RUN completed. Run without -DryRun to apply changes." -ForegroundColor Yellow
} else {
    Write-Host "`nMigration completed successfully!" -ForegroundColor Green
}
