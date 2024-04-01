import request from "request";

export default  AuthManager;

/**
 * Скрытая интеграция с Auth провайдером, под которым подразумевается внешний модуль, 
 * обеспечивающий идентификацию, аутентификацию и авторизацию запросов пользователей, 
 * а также кросс-микросервисных запросов.
 * 
 * Доступные схемы авторизации, такие как RBAC/ABAC и т.д зависят исключительно от внешнего 
 * модуля (т.е база учетных данных + карта разрешений).
 * 
 * Данный сервис реализует интеграцию с проприетарным модулем, но при необходимости все стратегии могут 
 * быть полностью заменены на этапе инициализации фреймворка через options.setAuthProvider, а 
 * скрытый проброс oAuth контроллеров отвключен.
 * 
 * Дополнительно:
 * Коды ошибок влияют на поведение связанного front-end модуля. В зависимости от полученной ошибки, может 
 * произойти редирект на oAuth страницу регистрации/авторизации или ограничения доступа. 
 * См. /frontend/services/requestManager.js
 **/
function AuthManager({config, apiManager}){
	const self = this;
 	const {verifyRequest, exchangeToken, exchangeCode} = declareUsedApis();

	self.controllers = {
		ExchangeToken,
		ExchangeCode
	};

	self.authStrategies = {
		"bypass": {
			description: 'Запросы к методу обходят проверку аутентификации и авторизации.',
			errors: {},
			handler: async ()=> ({
				success: true, result: {}
			})
		},

		"authorized:user": {
			description: `
				Запросы проверяются в центре аутентификации. В заголовках запроса нужен token идентифицирующий пользователя, 
			`,
			
			errors: {
				"unauthenticated": "Invalid credentials",
				"unauthorized": "Invalid permissions",
				"evRequired": "Email verification is required"
			},

			handler: async ({req}) => {
				return await verify({req, type: "token"});
			}
		},

		"authorized:app": {
			description: `
				Запросы проверяются в центре аутентификации. В заголовках запроса нужен api_key идентифицирующий микросервис. Ошибки транслируются из auth_api.
			`,

			errors: {
				"unauthenticated": "Invalid credentials",
				"unauthorized": "Invalid app permissions"
			},

			handler: async ({req}) => {
				return await verify({req, type: "api_key"});
			}
		},

		"authorized": {
			description: `
				Запросы проверяются в центре аутентификации. В заголовках запроса может быть либо token идентифицирующий пользователя, 
				либо api_key идентифицирующий микросервис. Ошибки транслируются из auth_api.
			`,

			errors: {
				"unauthenticated": "Invalid credentials",
				"unauthorized": "Invalid permissions",
				"evRequired": "Email verification is required"
			},

			handler: async ({req}) => {
				return await verify({req});
			}
		}
	};

	//[Контроллер] Позволяет получить временный oAuth code вместо token
	function ExchangeToken(){
		return {
			endpoint: "/api/exchangeToken",
			auth: "bypass",
			description: "",
			errors: {},
			
			reqSchema: ({string}, {})=> ({
				token: string(/.{1,100}/)
			}),

			resSchema: ({string}, {})=> ({
				code: string(/.{1,100}/)
			}),

			controller: async function({body, authResult, req, res}){
				const response = await exchangeToken({
					api_key: config.api_key,
					token: body.token
				});

				if(response.success){
					return response.result;
				} else {
					throw new Error("500");
				}	
			}
		}
	}

	//[Контроллер] Позволяет получить token по oAuth code
	function ExchangeCode(){
		return {
			endpoint: "/api/exchangeCode",
			auth: "bypass",
			description: "",
			errors: {},
			
			reqSchema: ({string})=> ({
				code: string(/.{1,100}/)
			}),

			resSchema: ({string}, {})=> ({
				token: string(/.{1,100}/)
			}),

			controller: async function({body, authResult, req, res}){
				const response = await exchangeCode({
					api_key: config.api_key,
					code: body.code
				});

				if(response.success){
					return response.result;
				} else {
					throw new Error("500");
				}	
			}
		}
	}

	function declareUsedApis(){
		apiManager.createRawOne({
			method: "POST",
			microservice: "auth_api",
			endpoint: "/api/verifyRequest",
			reqSchema: ({string})=> ({
				api_key: string(/.{1,100}/),//API ключ самого микросервиса (объект)
				endpoint: string(/.{1,100}/),

				//API субьекта запроса (тот кто запросил)
				api_key_subject: string(/.{1,100}/).optional(),//Будет проверяться может ли субьет запросить метод обьекта
				token: string(/.{1,100}/).optional(),//access token пользователя
			}),	

			resSchema: ({number})=> ({
				userId: number(/[0-9]{1,30}/).optional(),//Идентификатор пользователя
				appId: number(/[0-9]{1,30}/).optional(),//Идентификатор микросервиса
			})
		});

		apiManager.createRawOne({
			method: "POST",
			microservice: "auth_api",
			endpoint: "/api/getCodeByToken",
			reqSchema: ({string}, {})=> ({
				api_key: string(/.{1,100}/),
				token: string(/.{1,100}/)
			}),	

			resSchema: ({string})=> ({
				code: string(/.{1,100}/)
			})
		});

		apiManager.createRawOne({
			method: "POST",
			microservice: "auth_api",
			endpoint: "/api/getTokenByCode",
			reqSchema: ({string})=> ({
				api_key: string(/.{1,100}/),
				code: string(/.{1,100}/)
			}),	

			resSchema: ({string})=> ({
				token: string(/.{1,100}/)
			})
		});

		return apiManager.use("auth_api", {
			verifyRequest: "/api/verifyRequest",
			exchangeToken: "/api/getCodeByToken",
			exchangeCode: "/api/getTokenByCode"
		});
	}

	//Через запрос к auth_api проверяет может ли тот или иной субьет выполнить запрос к объекту
	//Например пользователь или другой модуль к текущему модулю (микросервису).
	async function verify({req, type}){
		var token = req.headers && req.headers.token ? req.headers.token : "";
		var api_key = req.headers && req.headers.api_key ? req.headers.api_key : "";

		if(!config.microservices || !config.microservices.auth_api){
			console.error(new Error(`Auth API url doesn't exists in config.microservices.auth_api`));
			process.exit(-1);
		}

		if(!config.api_key){
			console.error(new Error(`Service API key doesn't exists in config.horizen.api_key`));
			process.exit(-1);
		}

		if(!token && !api_key){
			token = "invalidtoken";
		}

		if((api_key || type === "api_key") && type !== "token"){
			api_key = api_key || "invalidApiKey";

			try{
				const res = await verifyRequest({
					api_key: config.api_key,
					api_key_subject: api_key,
					endpoint: req.path
				});

				return res;
			} catch(e){
				throw new Error(e.code || "500");
			}
		} else {
			try{
				const res = await verifyRequest({
					api_key: config.api_key,
					token: token,
					endpoint: req.path
				});

				return res;
			} catch(e){
				throw new Error(e.code || "500");
			}
		}
	}
}
