const fs = require('fs');
const path = require('path');

const files = [
    'src/pages/AboutPage.tsx',
    'src/components/Navbar.tsx',
    'src/components/Footer.tsx',
    'src/pages/ManagementPage.tsx',
    'src/pages/OrganizationChartPage.tsx',
    'src/components/HomeAnnouncements.tsx',
    'src/components/PRPoster.tsx'
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content
            .replace(/bg-teal-/g, 'bg-emerald-')
            .replace(/text-teal-/g, 'text-emerald-')
            .replace(/border-teal-/g, 'border-emerald-')
            .replace(/from-teal-/g, 'from-emerald-')
            .replace(/to-teal-/g, 'to-emerald-')
            .replace(/ring-teal-/g, 'ring-emerald-')
            .replace(/accent-teal-/g, 'accent-emerald-');

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Updated ${file}`);
        } else {
            console.log(`No change for ${file}`);
        }
    } else {
        console.log(`File not found: ${file}`);
    }
});
