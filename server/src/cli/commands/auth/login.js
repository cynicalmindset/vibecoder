import {cancel, confirm, intro , isCancel, outro} from "@clack/prompts";
import { logger } from "better-auth";
import {createAuthClient} from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import chalk from "chalk";
import { Command } from "commander";
import fs from "node:fs/promises";
import open from "open";
import os from "os";
import path from "path";
import yoctoSpinner from "yocto-spinner";
import * as z from "zod/v4";
import dotenv from "dotenv";
import prisma from "../../../lib/db.js";


dotenv.config()

const URL = "http://localhost:3005"
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CONFIG_DIR = path.join(os.homedir(),".better-auth");
const TOKEN_FILE = path.join(CONFIG_DIR, "token.json");

export async function loginactions(opts){
    const options = z.object({
        serverUrl:z.string().optional(),
        clientId:z.string().optional()
    }).parse(opts)

    const serverUrl = options.serverUrl || URL;
    const clientId = options.clientId || CLIENT_ID;

    intro(chalk.bold("auth cli login"))

    const exitingToken = false;
    const expired = false;

    if(exitingToken && !expired){
        const shouldreauth = await confirm({
            message:"already login, do you want to log again diva?",
            initialValue:false
        })

        if(isCancel(shouldreauth) || !shouldreauth){
            cancel("log cancelled")
            process.exit(0)
        }
    }
    const authclient = createAuthClient({
        baseURL:serverUrl,
        plugins:[deviceAuthorizationClient]
    })
    const spinner = yoctoSpinner({text:"requesting device confirmation nigga wait..."});
    spinner.start();


    try{
        const {data,error} = await authclient.device.code({
            client_id:clientId,
            scope:"openid profile email"
        })
        spinner.stop()
        if(error || !data){
//             console.log("full error:", JSON.stringify(error, null, 2));
//   console.log("full data:", JSON.stringify(data, null, 2));
            logger.error(
                `failed to req device authorization: ${error.error_description}`
            )
            process.exit(1)
        }

        const {
            device_code,
            user_code,
            verification_uri,
            verification_uri_complete,
            interval = 5,
            expires_in,
        } = data;

        console.log(chalk.red("device auth required"));
        console.log(`PLEASE VISIT ${chalk.underline.blue(verification_uri || verification_uri_complete)}`);
        console.log(`Enter code: ${chalk.bold.cyan(user_code)}`);

        const shouldopen = await confirm({
            message:"open browser automatically",
            initialValue:true
        })
        if(!isCancel(shouldopen) && shouldopen){
            const urltoopen = verification_uri || verification_uri_complete;
            await open(urltoopen)
        }

        console.log(
            chalk.gray(
                `waiting for authorization (expires in ${Math.floor(
                    expires_in / 60
                )} minutes)...`
            )
        );

    }catch(error){}
}

export const login = new Command("login")
.description("login to better auth")
.option("--server-url <url>", "auth server url",URL)
.option("--client-id <id>", "client ID",CLIENT_ID)
.action(loginactions)