import authManager from '../AuthManager/service.js';

export default FrameManager;

const MODULE_NAME = process.env.MODULE_NAME || "undefined";

function FrameManager(){
    const self = this;
    const cache = {path: "", height: 0};

    self.addListener = addListener;
    self.removeListener = removeListener;
    self.listener = null;
    self.initiated = null;

    const intervalId = setInterval(function(){
        try{
            if(isFramed()){
                sendEvents();
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

    function sendEvents(){
        const path = `${window.location.pathname}${window.location.search}`;
        const height = Math.max(document.body.scrollHeight, document.body.offsetHeight, document.body.clientHeight);

        if((cache.path !== path) || (cache.height !== height)){
            cache.path = path;
            cache.height = height;

            window.parent.postMessage(JSON.stringify({
                type: "hFrame",
                name: MODULE_NAME,
                height: height,
                path: path
            }), "*");
        }
    }
    
    function listenEvents(){
        if(!self.initiated){
            window.addEventListener("message", (msg)=> {
                try{
                    const params = JSON.parse(msg.data);
                    
                    if(params.type === "hFrame"){
                        if(self.listener){
                            self.listener(params);
                        }
                    }

                    else if(params.type === "hAuthFrameRequest"){
                        if(!isFramed()){
                            msg.source.postMessage(JSON.stringify({
                                type: "hAuthFrameResponse",
                                auth_token: authManager.getAuthToken()
                            }), msg.origin);
                        }
                    }

                    else if(params.type === "hAuthError"){
                        if(params.code === "unauthenticated" && UNAUTHENTICATED_CALLBACK_URL){
                            authManager.onUnauthenticated();
                        }

                        else if(params.code === "evRequired" && CONFIRM_EMAIL_CALLBACK_URL){
                            authManager.onEvRequired();
                        }
                    }
                } catch(e){
                    console.log(e);
                }
            }, false);

            self.initiated = true;
            clearInterval(intervalId);
        }
    }
}

export function onUnauthenticated(){
    window.top.postMessage(JSON.stringify({
        type: "hAuthError",
        code: "unauthenticated",
        name: MODULE_NAME
    }), "*");
}

export function onEvRequired(){
    window.top.postMessage(JSON.stringify({
        type: "hAuthError",
        code: "evRequired",
        name: MODULE_NAME
    }), "*");
}

export function requestTokenFromTop(){
    return new Promise((resolve, reject)=> {
        window.addEventListener("message", listener, false);

        window.top.postMessage(JSON.stringify({
            type: "hAuthFrameRequest",
            name: MODULE_NAME
        }), "*");

        function removeListener(){
            window.removeEventListener("message", listener, false); 
        }

        function listener(msg){
            try{
                const params = JSON.parse(msg.data);
               
                if(params.type === "hAuthFrameResponse"){
                    removeListener();
                    resolve(params.auth_token);
                }
            } catch(e){
                console.log(e);
            }
        }
    });
}

export function isFramed(){
    return window.self !== window.top;
}