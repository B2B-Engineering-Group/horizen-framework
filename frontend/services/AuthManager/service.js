export default new AuthManager();

function AuthManager(){
    let self = this;
    let authTokenLSKey = "auth_token";

    self.getAuthTokenLSKey = getAuthTokenLSKey;
    self.getAuthToken = getAuthToken;
    self.setAuthToken = setAuthToken;
    self.dropSession = dropSession;

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
