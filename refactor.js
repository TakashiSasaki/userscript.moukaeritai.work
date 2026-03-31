const fs = require('fs');
const path = require('path');

const dir = 'gemini.google.com';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.user.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(dir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Bump version
    content = content.replace(/(@version\s+)(\d+\.\d+\.)(\d+)/, (match, p1, p2, p3) => {
        return p1 + p2 + (parseInt(p3) + 1);
    });
    content = content.replace(/(const\s+VERSION\s*=\s*['"])(\d+\.\d+\.)(\d+)(['"])/, (match, p1, p2, p3, p4) => {
        return p1 + p2 + (parseInt(p3) + 1) + p4;
    });

    const lines = content.split('\n');
    let injectIndex = -1;
    let registerRegex = /registerGeminiUserscript/;
    let returnDomainRegex = /if \(location\.hostname === 'userscript\.moukaeritai\.work'\) \{[\s\S]*?return;[\s\S]*?\}/;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('registerGeminiUserscript')) {
            injectIndex = i;
            break;
        }
    }

    if (injectIndex === -1) {
        // Fallback: after the domain return
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('userscript.moukaeritai.work') && lines[i+1] && lines[i+1].includes('return;')) {
                injectIndex = i + 2;
                break;
            }
        }
    }

    if (injectIndex !== -1) {
        const preamble = lines.slice(0, injectIndex + 1);
        const rest = lines.slice(injectIndex + 1);

        // Find the ending '})();'
        let endIndex = rest.length - 1;
        while (endIndex >= 0 && !rest[endIndex].includes('})();')) {
            endIndex--;
        }

        if (endIndex !== -1) {
            const body = rest.slice(0, endIndex);
            const tail = rest.slice(endIndex);

            const newBody = [
                '',
                '    const initUserScript = () => {',
                ...body.map(line => '    ' + line),
                '    };',
                '',
                "    if (document.readyState === 'complete') {",
                '        initUserScript();',
                '    } else {',
                "        window.addEventListener('load', initUserScript);",
                '    }'
            ];

            const newContent = [...preamble, ...newBody, ...tail].join('\n');
            fs.writeFileSync(file, newContent, 'utf8');
        }
    }
});
