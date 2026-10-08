const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const YAML = require('yaml');

const args = process.argv.slice(2);
const templateSelection = args[0];
const projectName = args[1];
const customGroupId = args[2];

if (!projectName || !templateSelection) {
    console.error("❌ Error : Select one template for the project '<'hexagonal|monolithic>.");
    console.error("💡 Exemple : node generator.js hexagonal my-app [com.mycompany.service]");
    process.exit(1);
}

const templatePath = path.join(__dirname, 'templates', templateSelection + '.yaml');
if (!fs.existsSync(templatePath)) {
    console.error(`❌ Error : Template not found : ${templatePath}`);
    process.exit(1);
}

const yamlFile = fs.readFileSync(templatePath, 'utf8');
const templateConfig = YAML.parse(yamlFile);

const projectFolderName = projectName.toLowerCase().replace(/[^a-z0-9-_]/g, '');

if (!projectFolderName) {
    console.error("❌ Error : Project Label should have at least one aphanumeric character.");
    process.exit(1);
}

const projectPascalCase = projectFolderName
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const packageSafeName = projectFolderName.replace(/[-_]/g, '');

const baseGroupId = (customGroupId || templateConfig.config?.baseGroupId)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '');

const basePackage = `${baseGroupId}.${packageSafeName}`;
const packagePath = basePackage.replace(/\./g, '/');
const outputDir = path.join(__dirname, 'out');
const rootDir = path.join(outputDir, projectFolderName);

const context = {
    projectName,
    projectFolderName,
    projectPascalCase,
    baseGroupId,
    basePackage,
    packagePath,
    ...templateConfig.config
};

function render(templateStr, ctx) {
    if (!templateStr) return '';
    return templateStr.replace(/\{\{([\w-]+)\}\}/g, (match, key) => {
        if (ctx[key] === undefined) {
            throw new Error(`❌ Placeholder not found : {{${key}}} — check 'config' section or YAML template.`);
        }
        return ctx[key];
    });
}

function writeFileWithSanityCheck(evaluatedPath, rawContent, resolvedRootDir) {
    const fullFilePath = path.resolve(rootDir, evaluatedPath);

    if (!fullFilePath.startsWith(resolvedRootDir + path.sep)) {
        throw new Error(`❌ Weird file path (Out of project directory) : ${evaluatedPath}`);
    }

    const fullDirPath = path.dirname(fullFilePath);

    if (!fs.existsSync(fullDirPath)) {
        fs.mkdirSync(fullDirPath, { recursive: true });
    }

    let evaluatedContent = render(rawContent, context);

    evaluatedContent = evaluatedContent
        .replace(/^package\s+([a-zA-Z0-9_/\.]+)/gm, (match, p1) => `package ${p1.replace(/\//g, '.')}`)
        .replace(/^import\s+([a-zA-Z0-9_/\.]+)/gm, (match, p1) => `import ${p1.replace(/\//g, '.')}`);

    fs.writeFileSync(fullFilePath, evaluatedContent.trim() + '\n', 'utf-8');
    console.log(`  ✅ Generated : ${evaluatedPath}`);
}

function generateProject() {
    if (fs.existsSync(rootDir)) {
        console.error(`❌ Error : Directory ./out/${projectFolderName} already exist.`);
        process.exit(1);
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`📁 Creating Project folder : ./out/${projectFolderName}`);

    const resolvedRootDir = path.resolve(rootDir);
    const fileEntries = templateConfig.Project?.paths || templateConfig.files || [];

    fileEntries.forEach(entry => {
        const basePath = render(entry.path, context);

        if (entry.content !== undefined) {
            writeFileWithSanityCheck(basePath, entry.content, resolvedRootDir);
        }

        if (Array.isArray(entry.files)) {
            entry.files.forEach(fileItem => {
                const subPath = render(fileItem.subpath, context);
                const fullRelativePath = path.join(basePath, subPath);
                writeFileWithSanityCheck(fullRelativePath, fileItem.content || '', resolvedRootDir);
            });
        }
    });

    try {
        console.log("🔧 Init Git depot ...");
        execSync('git init', { cwd: rootDir, stdio: 'ignore' });
        execSync('git add .', { cwd: rootDir, stdio: 'ignore' });
        execSync('git commit -m "Initial commit from external YAML templates"', { cwd: rootDir, stdio: 'ignore' });
        console.log("  ✅ Git inited !");
    } catch (error) {
        console.log("⚠️ Git couldn't be configured automatically.");
    }

    console.log(`\n🎉 Project "${projectName}" sucessfully generated ./out/${projectFolderName} !`);
}

generateProject();