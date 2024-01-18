export default RequestManager;

import authManager from '../AuthManager/service.js';
import defaultRoutes from './routes.json' assert {type: "json"};

const UNAUTHENTICATED_CALLBACK_URL =  process.env.UNAUTHENTICATED_CALLBACK_URL;
const UNAUTHORIZED_CALLBACK_URL = process.env.UNAUTHORIZED_CALLBACK_URL;
const ACCESS_DENIED_CALLBACK_URL = process.env.ACCESS_DENIED_CALLBACK_URL;

const queue = [];
var inprogress = false;

function RequestManager(){
    let self = this;
    let queueMode = false;
    let domain = "";
    let allRoutes = defaultRoutes;
    let allErrHandlers = {};
    let requestHandlers = {
        post: postRequest
    };

    self.addRoutes = addRoutes;
    self.setDomain = setDomain;
    self.setQueueMode = setQueueMode;
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
                    
                    return window.location.href.split("?")[0] + queryParams.toString()
                } else{
                    return window.location.href;
                }
            }
        }
    }

    /**
     * set api domain
     * @param {String} url
     */
    function setDomain(url){
        domain = url;
    }    

    /**
     * if set in true, all requests will be sent in turn
     * @param {*} value 
     */    
    function setQueueMode(value){
        queueMode = value;
    }

    /**
     * add api methods for requests
     * @param {object} customRoutes
     * {
     *      apiMethodName: {
     *          method: "post",
     *          url: "/v1/..." 
     *      }
     * }
     */
    function addRoutes(customRoutes = {}){
        allRoutes = Object.assign({}, allRoutes, defaultRoutes, customRoutes);
    }

    /**
     * add common error handlers
     * @param {object} customHandlers
     * {
     *      errCode: async (err) => {},
     *      default: async (err) => {}
     * }
     */
    function addCommonErrHandlers(customHandlers){
        allErrHandlers = Object.assign({}, allErrHandlers, customHandlers);
    }

    /**
     * Main method for requests
     * @param {String} name 
     * @param {Object} settings - 
     * {
     *      params: {},
     *      auth: true/false
     * }
     */
    function makeRequest(name, settings = {}){
        return new Promise((resolve, reject) => {
            var method = "post";
            var url = ("" + name).match(/^\/api/) ? name : `/api/${name}`;

            if(allRoutes[name]){
                method = allRoutes[name].method;
                url = allRoutes[name].url;
            }

            ensureCodeAuth().then(function(){
                queueMode ? queueFlow() :  directFlow();

                function directFlow(){
                    requestHandlers[method](url, settings).then(resolve, reject)
                }

                function queueFlow(){
                    queue.push(()=>{
                        inprogress = true;
                        requestHandlers[method](url, settings).then(resolve, reject).then(next, next);
                    });
        
                    if(!inprogress){
                        next();
                    }
        
                    function next(){
                        inprogress = false;
        
                        if(queue.length){
                            queue.shift()()
                        }
                    }
                }
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
                        window.location.replace(`${redirect}?callback=${window.location.href}`, "_self");
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
 
    /**
     * Make request and check response
     * @param {String} url 
     * @param {Object} options 
     */
    async function request(url, options){
        const res = await fetch(domain + url, options);
        const response = await res.json();

        if(!response.errored){
            return response.result;
        }else{
            throw response;
        }
    }

    /**
     * Common error handler. Run custom handler or return reject.
     * @param {*} err 
     */
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

    /**
     * Add auth token in request headers
     * @param {*} options 
     */
    function ensureAuthHeaders(options = {}){
        let token = authManager.getAuthToken();

        options.headers = options.headers || {};
        options.headers.token = token;

        return options;
    }
}