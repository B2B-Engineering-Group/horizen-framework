export default FrameManager;

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
    }

    function removeListener(){
        self.listener = null;
    }

    function sendEvents(){
        const body = document.body;
        const html = document.documentElement;
        const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
        const path = `${window.location.pathname}${window.location.search}`

        if((cache.path !== path) || (cache.height !== height)){
            cache.path = path;
            cache.height = height;

            window.parent.postMessage(JSON.stringify({
                type: "hFrame",
                name: process.env.name || "undefined",
                height: height,
                path: path
            }), "*");
        }
    }
    
    function listenEvents(){
        if(!self.initiated){
            window.addEventListener("message", (msg)=> {
                console.log("Added event listener");
                try{
                    const params = JSON.parse(msg.data);

                    if(params.type === "hFrame"){
                        if(self.listener){
                            self.listener(params);
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

    function isFramed(){
        return window.self !== window.top;
    }
}