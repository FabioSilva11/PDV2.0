$path = 'src/data/seedData.ts'
$content = Get-Content $path -Raw
$content = $content -replace "aberta: true,\s*\n\s*abertoEm: '.*?',\s*\n\s*turnosHistorico:", "aberta: true,\n  turnosHistorico:"
Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host 'Done'