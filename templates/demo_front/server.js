import express from "express";
import next from "next";
import {createProxyMiddleware} from "http-proxy-middleware";
import config from "./config.json" assert {type: "json"};

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = express();

    server.use("/api", createProxyMiddleware({
        target: config.server.apiUrl
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