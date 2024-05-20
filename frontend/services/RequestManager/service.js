export default RequestManager;

import authManager from '../AuthManager/service.js';
import {isFramed, postMessage} from '../FrameManager/service.js';

function RequestManager(){
    let self = this;
    let requestHandlers = {
        post: postRequest
    };

    self.call = call;
    self.logout = postMessage.logout;
    
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
                headers: Object.assign({
                    'Content-Type': 'application/json;charset=utf-8'
                }, settings.headers || {})
            };
            
            if(settings.auth){
                options = await ensureAuthHeaders(options);
            }

            if(settings.file){
                options = await ensureFormData(options);
            }

            request(url, options).then(resolve, (res)=> {
                onError(res, reject);
            });
        }); 

        function onError(res, next){
            if(res.errored && res.code === "unauthenticated"){
                postMessage.unauthenticated()
            }

            else if(res.errored && res.code === "evRequired"){
                postMessage.evRequired();
            }

            else if(res.errored && res.code === "unauthorized"){
                authManager.onUnauthorized();
            }

            else {
                next(res);
            }
        }

        async function ensureFormData(options = {}){
            let formData = new FormData();

            formData.append("file", settings.file);

            options.body = formData;

            delete options.headers['Content-Type'];

            return options;
        }

        async function ensureAuthHeaders(options = {}){
            let token = null;

            if(isFramed()){
                token = await postMessage.requestToken();
            } else {
                token = authManager.getAuthToken();
            }

            options.headers = options.headers || {};
            options.headers.token = token;
     
            return options;
        }
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
}