import config from "./config.front.json" assert {type: "json"};

export default {
  reactStrictMode: false,
  env: config.env || {}
}

