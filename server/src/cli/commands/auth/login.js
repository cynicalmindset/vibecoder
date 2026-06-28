import {cancel, confirm, intro , isCancel, outro, select} from "@clack/prompts";
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
import { clearstoretoken, getstoredtoken, istokenexpired, requireauth, storetoken } from "../../../lib/token.js";



dotenv.config()

const URL = "http://localhost:3005"
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
export const CONFIG_DIR = path.join(os.homedir(),".better-auth");
export const TOKEN_FILE = path.join(CONFIG_DIR, "token.json");





export async function loginactions(opts){
    const options = z.object({
        serverUrl:z.string().optional(),
        clientId:z.string().optional()
    }).parse(opts)

    const serverUrl = options.serverUrl || URL;
    const clientId = options.clientId || CLIENT_ID;

    intro(chalk.bold("auth cli login"))

    const exitingToken = await getstoredtoken();
    const expired = await istokenexpired();

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
            const urltoopen = verification_uri_complete || verification_uri;
            await open(urltoopen)
        }

        console.log(
            chalk.gray(
                `waiting for authorization (expires in ${Math.floor(
                    expires_in / 60
                )} minutes)...`
            )
        );

        const token = await pollfortoken(
            authclient,
            device_code,
            clientId,
            interval
        )

        if(token){
            const saved = await storetoken(token)
            if(!saved){
                console.log(
                    chalk.yellow("\n could not save auth token, you may need to login again")
                )
            }
           // TODO _ GET USER DATA HERE

           outro(chalk.green("login done"))
           console.log(
            chalk.gray(`token saved in: ${TOKEN_FILE}`)
           )
        }

    }catch(error){
        spinner.stop();
        console.error(
            chalk.red("login failed due to: "),error.message
        )
        process.exit(1);
    }
}

async function pollfortoken(authClient, deviceCode, clientId, initialInterval){
    let pollingInterval = initialInterval
    const spinner = yoctoSpinner({text: "",color:'red'})
    let dots = 0;

    return new Promise((resolve,reject)=>{
        const poll = async ()=>{
            dots = (dots+1)%4;
            spinner.text = chalk.gray(
                `polling for authorization ${".".repeat(dots)}${" ".repeat(3-dots)}`
            );
            if(!spinner.isSpinning) spinner.start();

            try{
                const {data, error} = await authClient.device.token({
                    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                    device_code:deviceCode,
                    client_id:clientId,
                    fetchOptions: {
                        headers: {
                            "user-agent": `My CLI`,
                        },
                    },
                });

                if(data?.access_token){
                    console.log(
                        chalk.bold.yellow(`Your access token is: ${data.access_token}`)
                    );
                    spinner.stop()
                    resolve(data);
                    return;
                }
                else if (error) {
    switch (error.error) {
      case "authorization_pending":
        // Continue polling
        break;
      case "slow_down":
        pollingInterval += 5;
        break;
      case "access_denied":
        console.error("Access was denied by the user");
        return;
      case "expired_token":
        console.error("The device code has expired. Please try again.");
        return;
      default:
        spinner.stop()
        logger.error(`Error: ${error.error_description}`);
        process.exit(1)
    }
}
            }catch(error){
                spinner.stop()
        logger.error(`Network Error: ${error.error_description}`);
        process.exit(1)
            }

            setTimeout(poll, pollingInterval*1000);
        }
          setTimeout(poll, pollingInterval*1000);
    })
}


export async function logoutaction(){
    intro(chalk.bold("tussi logout kre?"));
    const token = await getstoredtoken();
    if(!token){
        console.log(chalk.yellow("login tho kr pehele"));
        process.exit(0);
    }
    const shouldlogout = await confirm({
        message: "tussi logout na kr",
        initialValue:false,
    });
    if(isCancel(shouldlogout) || !shouldlogout){
        cancel("logout canclelled yayyyy");
        process.exit(0);
    }
    const cleared = await clearstoretoken();
    if(cleared){
        outro(chalk.cyan("bye bye nigga.."));
    }else{
        console.log(
            chalk.yellow("could not clear token file")
        )
    }
}

export async function whoamicmd(opts){
    const token = await requireauth();
    if(!token?.access_token){
        console.log("no access token found")
        process.exit(1)
    }
    const user = await prisma.user.findFirst({
        where:{
            sessions:{
                some:{
                    token:token.access_token,
                },
            },
        },
        select:{
            id:true,
            name:true,
            email:true,
            image:true,

        }
    });
    console.log(
        chalk.bold.greenBright(`user: ${user.name}
        Email: ${user.email}
        ID: ${user.id}`)
    );
}


export const login = new Command("login")
.description("login to better auth")
.option("--server-url <url>", "auth server url",URL)
.option("--client-id <id>", "client ID",CLIENT_ID)
.action(loginactions)

export const logout = new Command("logout")
.description("logout and clear credentials")
.action(logoutaction)

export const whoami = new Command("whoami")
.description("show user details")
.option("--server-url <url>", "auth server url",URL)
.action(whoamicmd)