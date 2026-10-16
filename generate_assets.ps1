Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\arthu\.gemini\antigravity\scratch\oficina-saas-mobile\expo-app\assets\icon.jpg"
$outIcon = "C:\Users\arthu\.gemini\antigravity\scratch\oficina-saas-mobile\expo-app\assets\playstore_icon_512.png"
$outFeature = "C:\Users\arthu\.gemini\antigravity\scratch\oficina-saas-mobile\expo-app\assets\feature_graphic_1024x500.png"

$src = [System.Drawing.Image]::FromFile($srcPath)

# 1. 512x512 Icon
$dest512 = New-Object System.Drawing.Bitmap(512, 512)
$g512 = [System.Drawing.Graphics]::FromImage($dest512)
$g512.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g512.DrawImage($src, 0, 0, 512, 512)
$dest512.Save($outIcon, [System.Drawing.Imaging.ImageFormat]::Png)
$g512.Dispose()
$dest512.Dispose()

# 2. 1024x500 Feature Graphic
$destFeat = New-Object System.Drawing.Bitmap(1024, 500)
$gFeat = [System.Drawing.Graphics]::FromImage($destFeat)
$gFeat.Clear([System.Drawing.ColorTranslator]::FromHtml("#0b0e14"))

$iconSize = 280
$iconX = 70
$iconY = [int]((500 - $iconSize) / 2)
$gFeat.DrawImage($src, $iconX, $iconY, $iconSize, $iconSize)

$fontTitle = New-Object System.Drawing.Font("Arial", [float]44, [System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font("Arial", [float]20, [System.Drawing.FontStyle]::Regular)
$fontBadge = New-Object System.Drawing.Font("Arial", [float]14, [System.Drawing.FontStyle]::Bold)

$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#ffffff"))
$blueBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#38bdf8"))
$grayBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#94a3b8"))

$textX = $iconX + $iconSize + 50
$gFeat.DrawString("MecanicaPro", $fontTitle, $whiteBrush, [float]$textX, [float]150)
$gFeat.DrawString("Gestao Inteligente para sua Oficina", $fontSub, $blueBrush, [float]$textX, [float]225)
$gFeat.DrawString("OS  Clientes  Pecas  Faturamento  Offline", $fontBadge, $grayBrush, [float]$textX, [float]280)

$destFeat.Save($outFeature, [System.Drawing.Imaging.ImageFormat]::Png)

$gFeat.Dispose()
$destFeat.Dispose()
$src.Dispose()

Write-Output "SUCCESS"
