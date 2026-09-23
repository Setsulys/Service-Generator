const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const YAML = require('yaml');

const args = process.argv.slice(2);
const templateSelection = args[0];
const projectName = args[1];
const domainName = args[2];

if (!projectName || !domainName || !templateSelection) {
    console.error("❌ Erreur : Veuillez fournir le template, le nom du projet ET le nom de l'entité.");
    console.error("💡 Exemple : node generator.js hexagonal mon-app User");
    process.exit(1);
}

const templatePath = path.join(__dirname, 'templates', templateSelection + '.yaml');
if (!fs.existsSync(templatePath)) {
    console.error(`❌ Erreur : Template introuvable : ${templatePath}`);
    process.exit(1);
}

const yamlFile = fs.readFileSync(templatePath, 'utf8');
const templateConfig = YAML.parse(yamlFile);

// Sanitisation stricte de toutes les entrées utilisateur injectées dans des chemins de fichiers
const projectFolderName = projectName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
const domainSafe = domainName.replace(/[^a-zA-Z0-9]/g, '');

if (!projectFolderName || !domainSafe) {
    console.error("❌ Erreur : le nom du projet et le nom de l'entité doivent contenir au moins un caractère alphanumérique.");
    process.exit(1);
}

const domainUpper = domainSafe.charAt(0).toUpperCase() + domainSafe.slice(1);
const domainLower = domainSafe.charAt(0).toLowerCase() + domainSafe.slice(1);
const packageSafeName = projectFolderName.replace(/[-_]/g, '');

const baseGroupId = templateConfig.config.baseGroupId;
const basePackage = `${baseGroupId}.${packageSafeName}`;
const packagePath = basePackage.replace(/\./g, '/');
const outputDir = path.join(__dirname, 'out');
const rootDir = path.join(outputDir, projectFolderName);

// Contexte "plat" : les clés de templateConfig.config sont accessibles directement,
// ex: {{springBootVersion}}, {{kotlinVersion}}, {{javaVersion}}, {{baseGroupId}}
const context = {
    projectName,
    projectFolderName,
    domainUpper,
    domainLower,
    basePackage,
    packagePath,
    ...templateConfig.config
};

function render(templateStr, ctx) {
    return templateStr.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        if (ctx[key] === undefined) {
            throw new Error(`Placeholder non résolu : {{${key}}} — vérifiez le template YAML.`);
        }
        return ctx[key];
    });
}

function generateProject() {
    if (fs.existsSync(rootDir)) {
        console.error(`❌ Erreur : le dossier ./out/${projectFolderName} existe déjà.`);
        process.exit(1);
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`📁 Création du dossier projet : ./out/${projectFolderName}`);

    const resolvedRootDir = path.resolve(rootDir);

    templateConfig.files.forEach(file => {
        const evaluatedPath = render(file.path, context);
        const fullFilePath = path.resolve(rootDir, evaluatedPath);

        // 🔒 Garde-fou anti path traversal : le fichier généré doit rester dans rootDir
        if (!fullFilePath.startsWith(resolvedRootDir + path.sep)) {
            throw new Error(`❌ Chemin de fichier suspect (hors du dossier projet) : ${evaluatedPath}`);
        }

        const fullDirPath = path.dirname(fullFilePath);

        if (!fs.existsSync(fullDirPath)) {
            fs.mkdirSync(fullDirPath, { recursive: true });
        }

        const evaluatedContent = render(file.content, context);
        fs.writeFileSync(fullFilePath, evaluatedContent.trim() + '\n', 'utf-8');
        console.log(`  ✅ Généré : ${evaluatedPath}`);
    });

    try {
        console.log("🔧 Initialisation du dépôt Git...");
        execSync('git init', { cwd: rootDir, stdio: 'ignore' });
        execSync('git add .', { cwd: rootDir, stdio: 'ignore' });
        execSync('git commit -m "Initial commit from external YAML templates"', { cwd: rootDir, stdio: 'ignore' });
        console.log("✅ Git initialisé !");
    } catch (error) {
        console.log("⚠️ Git n'a pas pu être configuré automatiquement (dépôt non initialisé).");
    }

    console.log(`\n🎉 Projet "${projectName}" (Kotlin + Maven) créé avec succès dans ./out/${projectFolderName} !`);
}

generateProject();