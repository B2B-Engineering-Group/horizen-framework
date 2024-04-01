export default RequestManager;

import authManager from '../AuthManager/service.js';

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
    self.errHandler = errHandler;
    self.auth = authManager;

    async function ensureCodeAuth(){
        const code = (new URLSearchParams(window.location.search)).get("code");
        const redirect = UNAUTHORIZED_CALLBACK_URL;
        const token = authManager.getAuthToken();
        
        return await codeAuth();

        function codeAuth(){
            return new Promise(function(resolve, reject){
                if(code && redirect){
                    request("/api/exchangeCode", {
                        method: 'POST',
                        body: JSON.stringify({code}),
                        headers: {
                            'Content-Type': 'application/json;charset=utf-8'
                        }
                    }).then(onSuccess, onError);
                } else{
                    resolve();
                }

                function onSuccess(response){
                    authManager.setAuthToken(response.token);
                    window.location.replace(replaceCode(), "_self");
                }

                function onError(response){
                    window.location.replace(replaceCode(), "_self");
                }
            });

            function replaceCode(){
                const queryParams = new URLSearchParams(window.location.search)

                if(queryParams.has('code')){
                    queryParams.delete('code');
                    return window.location.href.split("?")[0] + "?" + queryParams.toString()
                } else{
                    return window.location.href;
                }
            }
        }
    }

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

            ensureCodeAuth().then(function(){
                requestHandlers[method](url, settings).then(resolve, reject)
            });
        })
    }

    function postRequest(url, settings){     
        return new Promise((resolve, reject) => {   
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
                options = ensureAuthHeaders(options);
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
                    const redirect = UNAUTHENTICATED_CALLBACK_URL;

                    if(redirect){
                        authManager.dropSession();
                        window.location.replace(`${redirect}?callback=${encodeURIComponent(window.location.href)}`, "_self");
                    }
                }

                else if(res.errored && res.code === "unauthorized" && UNAUTHORIZED_CALLBACK_URL){
                    const redirect = UNAUTHORIZED_CALLBACK_URL;

                    if(redirect){
                        window.location.replace(`${redirect}`, "_self");
                    }
                }

                else if(res.errored && res.code === "evRequired" && CONFIRM_EMAIL_CALLBACK_URL){
                    const redirect = CONFIRM_EMAIL_CALLBACK_URL;

                    if(redirect){
                        window.location.replace(`${redirect}`, "_self");
                    }
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

    function ensureAuthHeaders(options = {}){
        let token = authManager.getAuthToken();

        options.headers = options.headers || {};
        options.headers.token = token;

        return options;
    }
}