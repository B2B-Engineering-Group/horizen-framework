import config from "./config.json" assert {type: "json"};

export default {
  reactStrictMode: false,
  env: config.env || {}
}