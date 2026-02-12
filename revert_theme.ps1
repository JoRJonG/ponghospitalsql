$files = Get-ChildItem -Path "src" -Recurse -Include *.tsx,*.ts
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace 'bg-teal-', 'bg-emerald-' `
                           -replace 'text-teal-', 'text-emerald-' `
                           -replace 'border-teal-', 'border-emerald-' `
                           -replace 'from-teal-', 'from-emerald-' `
                           -replace 'to-teal-', 'to-emerald-' `
                           -replace 'ring-teal-', 'ring-emerald-' `
                           -replace 'accent-teal-', 'accent-emerald-'
    
    if ($content -ne $newContent) {
        $newContent | Set-Content $file.FullName -Encoding UTF8
        Write-Host "Updated $($file.Name)"
    }
}
