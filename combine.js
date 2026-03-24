const fs = require('fs');
const path = require('path');

try {
    const p1 = fs.readFileSync('part1.txt', 'utf8');
    const p2 = fs.readFileSync('part2.txt', 'utf8');
    const p3 = fs.readFileSync('part3.txt', 'utf8');
    const content = p1 + '\n' + p2 + '\n' + p3;
    fs.writeFileSync(path.join('src', 'pages', 'S11Page.tsx'), content, 'utf8');
    console.log('Combined successfully');
} catch (e) {
    console.error(e);
}
