export default RequestManager;

import authManager from '../AuthManager/service.js';
import {isFramed, requestTokenFromTop, onUnauthenticated, onEvRequired} from '../FrameManager/service.js';

const UNAUTHENTICATED_CALLBACK_URL =  process.env.UNAUTHENTICATED_CALLBACK_URL;
const UNAUTHORIZED_CALLBACK_URL = process.env.UNAUTHORIZED_CALLBACK_URL;
const ACCESS_DENIED_CALLBACK_URL = process.env.ACCESS_DENIED_CALLBACK_URL;
const LOGOUT_CALLBACK_URL = process.env.LOGOUT_CALLBACK_URL;

function RequestManager(){
    let self = this;
    let domain = "";
    let allErrHandlers = {};
    let requestHandlers = {
        post: postRequest
    };

    self.setDomain = setDomain;
    self.addCommonErrHandlers = addCommonErrHandlers;
    self.call = makeRequest;
    self.logout = ()=> isFramed() ? onUnauthenticated() : authManager.onUnauthenticated();
    self.errHandler = errHandler;
    self.auth = authManager;

    function setDomain(url){
        domain = url;
    }    

    function addCommonErrHandlers(customHandlers){
        allErrHandlers = Object.assign({}, allErrHandlers, customHandlers);
    }

    function makeRequest(name, settings = {}){
        return new Promise((resolve, reject) => {
            var method = "post";
            var url = ("" + name).match(/^\/api/) ? name : `/api/${name}`;

            authManager.ensureCodeAuth().then(function(){
                requestHandlers[method](url, settings).then(resolve, reject)
            });
        })
    }

    function postRequest(url, settings){     
        return new Promise(async (resolve, reject) => {   
            let options = {
                method: 'POST',
                body: JSON.stringify(settings.params || {}),
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                }
            };
            
            if(settings.signal){
                options.signal = settings.signal
            }

            if(settings.auth){
                options = await ensureAuthHeaders(options);
            }

            if(settings.headers){
                options.headers = Object.assign(options.headers, settings.headers);
            }

            if(settings.file){
                let formData = new FormData();

                formData.append("file", settings.file);

                options.body = formData;
                delete options.headers['Content-Type'];
            }

            request(url, options).then(resolve, function(res){
                if(res.errored && res.code === "unauthenticated" && UNAUTHENTICATED_CALLBACK_URL){
                    if(isFramed()){
                        console.log("post message onUnauthenticated");
                        onUnauthenticated();
                    } else {
                        console.log("onUnauthenticated");
                        authManager.onUnauthenticated();
                    }
                }

                else if(res.errored && res.code === "evRequired" && CONFIRM_EMAIL_CALLBACK_URL){
                    if(isFramed()){
                        onEvRequired();
                    } else {
                        authManager.onEvRequired();
                    }
                }

                else if(res.errored && res.code === "unauthorized" && UNAUTHORIZED_CALLBACK_URL){
                    authManager.onUnauthorized();
                }

                else {
                    reject(res);
                }
            })
        })
    }

    async function request(url, options){
        const res = await fetch(domain + url, options);
        const response = await res.json();

        if(!response.errored){
            return response.result;
        }else{
            throw response;
        }
    }

    function errHandler(err){
        return new Promise((resolve, reject) => {  
            const code =  err && err.code;
            const errType = code && allErrHandlers[code] ? code : "default";

            if(allErrHandlers[errType]){
                allErrHandlers[errType](err).then(resolve, reject);
            }else {
                throw err;
            }
        })
    }   

    async function ensureAuthHeaders(options = {}){
        let token = null;

        if(isFramed()){
            token = await requestTokenFromTop();
        } else {
            token = authManager.getAuthToken();
        }

        options.headers = options.headers || {};
        options.headers.token = token;
 
        return options;
    }
}