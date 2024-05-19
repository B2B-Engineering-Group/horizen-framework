const UNAUTHENTICATED_CALLBACK_URL =  process.env.UNAUTHENTICATED_CALLBACK_URL;
const UNAUTHORIZED_CALLBACK_URL = process.env.UNAUTHORIZED_CALLBACK_URL;
const ACCESS_DENIED_CALLBACK_URL = process.env.ACCESS_DENIED_CALLBACK_URL;
const LOGOUT_CALLBACK_URL = process.env.LOGOUT_CALLBACK_URL;

export default new AuthManager();

function AuthManager(){
    let self = this;
    let authTokenLSKey = "auth_token";

    self.getAuthTokenLSKey = getAuthTokenLSKey;
    self.getAuthToken = getAuthToken;
    self.setAuthToken = setAuthToken;
    self.dropSession = dropSession;
    self.onEvRequired = onEvRequired;
    self.onUnauthenticated = onUnauthenticated;
    self.onUnauthorized = onUnauthorized;
    self.ensureCodeAuth = ensureCodeAuth;

    function getAuthTokenLSKey(){
        return authTokenLSKey;
    }

    function getAuthToken(){
        return getLs().getItem(authTokenLSKey) || null;
    }

    async function ensureCodeAuth(){
        const code = (new URLSearchParams(window.location.search)).get("code");
        const redirect = UNAUTHORIZED_CALLBACK_URL;
        
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
                    setAuthToken(response.token);
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

    function setAuthToken(token){
        getLs().setItem(authTokenLSKey, token);
    }

    function dropSession(){
        getLs().setItem(authTokenLSKey, "");
    }

    function onEvRequired(){
        const redirect = CONFIRM_EMAIL_CALLBACK_URL;

        if(redirect){
            window.location.replace(`${redirect}`, "_self");
        }
    }

    function onUnauthenticated(){
        const redirect = UNAUTHENTICATED_CALLBACK_URL;

        if(redirect){
            dropSession();
            window.location.replace(`${redirect}?callback=${encodeURIComponent(window.location.href)}`, "_self");
        }
    }

    function onUnauthorized(){
        const redirect = UNAUTHORIZED_CALLBACK_URL;

        if(redirect){
            window.location.replace(`${redirect}`, "_self");
        }
    }
}

function getLs(){
    try{
        return localStorage;
    }catch(e){
        return getLSMock()
    }
}

function getLSMock(){
    let store = {};

    Object.defineProperty(store, 'getItem', {
        enumerable: false,
        writable: false,
        value: function(key) {
            return store[key] || null;
        }
    });

    Object.defineProperty(store, 'setItem', {
        enumerable: false,
        writable: false,
        value: function(key, value) {
            store[key] = value.toString();
        }
    });

    Object.defineProperty(store, 'removeItem', {
        enumerable: false,
        writable: false,
        value: function(key) {
            delete store[key];
        }
    });

    Object.defineProperty(store, 'clear', {
        enumerable: false,
        writable: false,
        value: function() {
            store = {};
        }
    });

    return store;
}
