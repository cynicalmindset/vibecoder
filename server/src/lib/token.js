import fs from "fs/promises";
import chalk from "chalk";
import { CONFIG_DIR, TOKEN_FILE } from "../cli/commands/auth/login.js";

export async function getstoredtoken(){
    try{
        const data = await fs.readFile(TOKEN_FILE,"utf-8");
        const token = JSON.parse(data);
        return token;
    }catch(error){
        return null
    }
}

export async function storetoken(token){
    try{
        await fs.mkdir(CONFIG_DIR,{recursive:true});
        const tokendata = {
            access_token: token.access_token,
            refresh_token:token.refresh_token,
            token_type:token.token_type || "Bearer",
            scope:token.scope,
            expires_at: token.expires_in
                ? new Date(Date.now()+token.expires_in*1000).toISOString()
                : null,
            created_at: new Date().toISOString(),
        };
        await fs.writeFile(TOKEN_FILE, JSON.stringify(tokendata, null, 2),"utf-8");
        return true;
    }catch(error){
        console.error(chalk.red("failed to store token:"),error.message);
        return false;
    }
}


export async function clearstoretoken(){
    try{
        await fs.unlink(TOKEN_FILE);
        return true;
    }catch (error){
        return false;
    }
}

export async function istokenexpired(){
    const token = await getstoredtoken();
    if(!token || !token.expires_at){
        return true
    }
    const expire = new Date(token.expires_at);
    const now = new Date();

    return expire.getTime() - now.getTime() < 5 * 60 * 1000;
}

export async function requireauth(){
    const token = await getstoredtoken();

    if(!token){
        console.log(
            chalk.red("not aunthicated, please run vibecoder login")
        );
        process.exit(1);
    }

    if(await istokenexpired()){
        console.log(
            chalk.yellow("session expired please run vibecoder login again")
        );
        process.exit(1);
    }

    return token;
}