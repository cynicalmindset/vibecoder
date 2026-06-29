import { promises as fs } from "fs";
import path from 'path'
import chalk from "chalk";
import { generateObject } from "ai";
import { success, z } from "zod";
import { describe } from "zod/v4/core";

const Applicaitonschema = z.object({
    folderName:z.string().describe("kebab-case folder name for application"),
    description:z.string().describe("Brief description of what was created"),
    files:z.array(
        z.object({
            path:z.string().describe("relative file path (eg:src/spp.jsx"),
            content:z.string().describe("complete file content")
        }).describe("all files needed for the application")
    ),
    setupCommands:z.array(
        z.string().describe("Bash commands to setup and run (eg: npm install, npm run dev")
    ),
    dependencies: z.record(z.string()).optional().describe('NPM dependencies with versions')
});

function printSystem(message){
    console.log(message)
}

function displayFileTree(files, folderName) {
  printSystem(chalk.cyan('\n📁 Project Structure:'));
  printSystem(chalk.white(`${folderName}/`));

  const filesByDir = {};
  files.forEach(file => {
    const parts = file.path.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';

    if (!filesByDir[dir]) {
      filesByDir[dir] = [];
    }
    filesByDir[dir].push(parts[parts.length - 1]);
  });

  Object.keys(filesByDir).sort().forEach(dir => {
    if (dir) {
      printSystem(chalk.white(`├── ${dir}/`));
      filesByDir[dir].forEach(file => {
        printSystem(chalk.white(`│   └── ${file}`));
      });
    } else {
      filesByDir[dir].forEach(file => {
        printSystem(chalk.white(`└── ${file}`));
      });
    }
  });
}


async function createapplicationfiles(baseDir, foldername, files){
    const appDir = path.join(baseDir,foldername)

    await fs.mkdir(appDir, {recursive:true});
    printSystem(chalk.red(`created directory: ${foldername}/`))

    for(const file of files){
        const filepath = path.join(appDir, file.path);
        const fileDir = path.dirname(filepath);

        await fs.mkdir(fileDir, {recursive:true});
        await fs.writeFile(filepath, file.content, 'utf8')
        printSystem(chalk.green(` done${file.path}`))


    }

    return appDir
}




export async function generateapplication(description , aiservice, cwd = process.cwd()){
    try {
        printSystem(chalk.red('Agent mode: generating your application...\n'));
        printSystem(chalk.gray(`Request: ${description}\n`))

        printSystem(chalk.magenta('Agent resposne:\n'))

        const result = await generateObject({
            model:aiservice.model,
            schema:Applicaitonschema,
            prompt:`Create a complete, production-ready application for: ${description}

CRITICAL REQUIREMENTS:
1. Generate ALL files needed for the application to run
2. Include package.json with ALL dependencies and correct versions
3. Include README.md with setup instructions
4. Include configuration files (.gitignore, .env.example, etc.)
5. Write clean, well-commented, production-ready code
6. Include proper error handling and input validation
7. Use modern JavaScript/TypeScript best practices
8. Make sure all imports and paths are correct
9. NO PLACEHOLDERS - everything must be complete and working
10. NO truncated code - every file must be fully written out
11. Every function must be implemented, not just stubbed
12. Include proper TypeScript types if using TypeScript

Provide:
- A meaningful kebab-case folder name for the project
- Complete file structure with all necessary files
- Full implementation of every single file
- A brief description of what was built
- All dependencies with versions
- setup commands ( cd folder, npm install , npm run dev, etc.)`
        })

        const application = result.object;

        printSystem(chalk.green(`\nGenerated:${application.folderName}\n`))
        printSystem(chalk.gray(`Description:${application.description}\n`))

        if(application.files.length === 0){
            throw new Error ('no files weere generated')
        }

        displayFileTree(application.files, application.folderName)

        printSystem(chalk.red(`\nCreating files...\n`));

        const appDir = await createapplicationfiles(cwd, application.folderName, application.files);

        printSystem(chalk.red(`\nApplication created successfully\n`));
        printSystem(chalk.red(`Location: ${chalk.bold(appDir)}\n`));

        if(application.setupCommands.length>0){
            printSystem(chalk.red('next steps:\n'));
            printSystem(chalk.white('```bash'));

            application.setupCommands.forEach(cmd=>{
                printSystem(chalk.white(cmd))
            });

             printSystem(chalk.white('```\n'));
        }

        return{
            folderName:application.folderName,
            appDir,
            files:application.files.map(f=>f.path),
            commands:application.setupCommands,
            success:true
        }
    } catch (error) {
        console.log('error in generating application: ',error.message);
        if(error.stack){
            printSystem(chalk.dim(error.stack+'\n'))
        }
        throw error;
    }
}