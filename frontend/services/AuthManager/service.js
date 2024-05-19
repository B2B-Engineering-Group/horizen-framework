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

    function getAuthTokenLSKey(){
        return authTokenLSKey;
    }

    function getAuthToken(){
        return getLs().getItem(authTokenLSKey) || null;
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
