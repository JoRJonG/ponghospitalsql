$files = @(
    "src/pages/AboutPage.tsx",
    "src/components/Navbar.tsx",
    "src/components/Footer.tsx",
    "src/pages/ManagementPage.tsx",
    "src/pages/OrganizationChartPage.tsx",
    "src/components/HomeAnnouncements.tsx",
    "src/components/PRPoster.tsx"
)

foreach ($path in $files) {
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        $newContent = $content -replace 'bg-teal-', 'bg-emerald-' `
                               -replace 'text-teal-', 'text-emerald-' `
                               -replace 'border-teal-', 'border-emerald-' `
                               -replace 'from-teal-', 'from-emerald-' `
                               -replace 'to-teal-', 'to-emerald-' `
                               -replace 'ring-teal-', 'ring-emerald-' `
                               -replace 'accent-teal-', 'accent-emerald-'
        
        if ($content -ne $newContent) {
            $newContent | Set-Content $path -Encoding UTF8
            Write-Host "Updated $path"
        } else {
            Write-Host "No change in $path"
        }
    } else {
        Write-Host "File not found: $path"
    }
}
