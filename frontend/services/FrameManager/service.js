const MODULE_NAME = process.env.MODULE_NAME || "undefined";

import authManager from '../AuthManager/service.js';

export const postMessage = {
    unauthenticated: ()=> {
        window.top.postMessage(JSON.stringify({
            type: "hFrame:auth:unauthenticated",
            name: MODULE_NAME
        }), "*")
    },

    logout: ()=> {
        window.top.postMessage(JSON.stringify({
            type: "hFrame:auth:logout",
            name: MODULE_NAME
        }), "*");
    },

    evRequired: ()=> {
        window.top.postMessage(JSON.stringify({
            type: "hFrame:auth:evRequired",
            name: MODULE_NAME
        }), "*")
    },

    requestToken: ()=> {
        return new Promise((resolve, reject)=> {
            const timeoutId = setTimeout(()=> {
                removeListener();
                reject("hFrame has not been initiated on this page");
            }, 5000);

            window.addEventListener("message", listener, false);

            window.top.postMessage(JSON.stringify({
                type: "hFrame:auth:requestToken",
                name: MODULE_NAME
            }), "*");

            function removeListener(){
                clearTimeout(timeoutId);
                window.removeEventListener("message", listener, false); 
            }

            function listener(msg){
                try{
                    const params = JSON.parse(msg.data);
                   
                    if(params.type === "hFrame:auth:responseToken"){
                        removeListener();
                        resolve(params.auth_token);
                    }
                } catch(e){
                    console.log(e);
                }
            }
        });
    },

    details: ({height, path})=> {
        window.top.postMessage(JSON.stringify({
            type: "hFrame:details",
            name: MODULE_NAME,
            height: height,
            path: path
        }), "*");
    }
}

export default function FrameManager(){
    const self = this;
    const cache = {path: "", height: 0};

    self.addListener = addListener;
    self.removeListener = removeListener;
    self.listener = null;
    self.initiated = null;

    const intervalId = setInterval(function(){
        try{
            if(isFramed()){
                sendDetails();
            } else {
                listenEvents();
            }
        } catch(e){}
    }, 100);

    function addListener(callback){
        if(self.listener){
            console.warn("hFrame listener is already declared. Use removeListener on unmount component.")
        }

        self.listener = callback;

        return new Promise(function(resolve){
            const intervalId = setInterval(function(){
                if(self.initiated){
                    clearInterval(intervalId);
                    resolve();
                }
            }, 100);
        });
    }

    function removeListener(){
        self.listener = null;
    }

    function sendDetails(){
        const path = `${window.location.pathname}${window.location.search}`;
        const height = Math.max(document.body.scrollHeight, document.body.offsetHeight, document.body.clientHeight);

        if((cache.path !== path) || (cache.height !== height)){
            cache.path = path;
            cache.height = height;

            postMessage.details(cache);
        }
    }
    
    function listenEvents(){
        if(!self.initiated){
            window.addEventListener("message", (msg)=> {
                try{
                    const params = JSON.parse(msg.data);
                    const types = {
                        "hFrame:auth:unauthenticated": authManager.onUnauthenticated,
                        "hFrame:auth:evRequired": authManager.onEvRequired,
                        "hFrame:auth:logout": authManager.logout,
                        "hFrame:details": ()=> self.listener ? self.listener(params) : null,
                        "hFrame:auth:requestToken": ()=> {
                            authManager.ensureCodeAuth().then(function(){
                                msg.source.postMessage(JSON.stringify({
                                    type: "hFrame:auth:responseToken",
                                    auth_token: authManager.getAuthToken()
                                }), msg.origin);
                            });
                        }
                    };

                    (!isFramed() && types[params.type]) ? types[params.type]() : null;
                } catch(e){
                    console.log(e);
                }
            }, false);

            self.initiated = true;
            clearInterval(intervalId);
        }
    }
}

export function isFramed(){
    return window.self !== window.top;
}