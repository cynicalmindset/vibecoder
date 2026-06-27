#!/usr/bin/env node

import dotenv from "dotenv";
import chalk from "chalk";
import figlet from "figlet";
import {Command} from "commander";
import { login } from "./commands/auth/login.js";
dotenv.config();

async function main() {
    console.log(
        chalk.red(
            figlet.textSync("Vibecoder", {
                font: "Standard",
                horizontalLayout: "default",
                verticalLayout: "default",
            })
        )
    );
    console.log(chalk.red("you lazy ass can't even shit without ai haan?\n"));

    const program = new Command("vibecoder")
    program.version("0.0.1")
    .description("Black slave inside CLI")
    .addCommand(login)

    program.action(()=>{
        program.help()
    });

    program.parse()
}

main().catch((err)=>{
    console.log(chalk.red("slave is angry cause: "),err)
    process.exit(1)
})