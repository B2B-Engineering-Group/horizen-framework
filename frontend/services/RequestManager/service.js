export default RequestManager;

import authManager from '../AuthManager/service.js';
import {isFramed, requestTokenFromTop, onUnauthenticated, onEvRequired} from '../FrameManager/service.js';

const LOGOUT_CALLBACK_URL = process.env.LOGOUT_CALLBACK_URL;

function RequestManager(){
    let self = this;
    let requestHandlers = {
        post: postRequest
    };

    self.call = call;
    self.logout = ()=> isFramed() ? onUnauthenticated() : authManager.onUnauthenticated();
    
    function call(name, settings = {}){
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
                if(res.errored && res.code === "unauthenticated"){
                    if(isFramed()){
                        onUnauthenticated();
                    } else {
                        authManager.onUnauthenticated();
                    }
                }

                else if(res.errored && res.code === "evRequired"){
                    if(isFramed()){
                        onEvRequired();
                    } else {
                        authManager.onEvRequired();
                    }
                }

                else if(res.errored && res.code === "unauthorized"){
                    authManager.onUnauthorized();
                }

                else {
                    reject(res);
                }
            })
        })
    }

    async function request(url, options){
        const res = await fetch(url, options);
        const response = await res.json();

        if(!response.errored){
            return response.result;
        }else{
            throw response;
        }
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