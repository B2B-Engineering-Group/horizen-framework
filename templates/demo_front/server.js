import express from "express";
import next from "next";
import fs from "fs";
import {createProxyMiddleware} from "http-proxy-middleware";
import config from "./config.json" assert {type: "json"};

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

ensureSSREnv();

app.prepare().then(() => {
    const server = express();

    server.use("/api", createProxyMiddleware({
        target: config.server.apiUrl
    }))

    server.use("/robots.txt", createProxyMiddleware({
        target: config.server.apiUrl + "/api/"
    }));

    server.use("/sitemap.xml", createProxyMiddleware({
        target: config.server.apiUrl + "/api/"
    }))

    server.all("*", handle);

    server.listen(config.server.port, (err) => {
        if (err) {
            console.log(err);
        }else{
            console.log(`Server ready on port ${config.server.port}`);
        }       
    })
})

function ensureSSREnv(){
    const env = Object.keys(config.env || {}).reduce((env, key) => {
        env += `${key}=${config.env[key]}\n`;
        return env;
    }, "");
    
    fs.writeFileSync("./.env.local", env);
}