import express from "express";
import http from 'http';
import bodyParser from 'body-parser';
import colors from "@colors/colors/safe.js";

export default ServerManager;

function ServerManager({config, Validator}) {
	const self = this;

	self.startServer = startServer;
	self.buildControllers = buildControllers;
	self.onHttpRequest = onHttpRequest;
	self.setAuthProvider = setAuthProvider;
	self.setCustomTypes = setCustomTypes;
	self.authProvider = null;
	self.Validator = Validator;
	self.customTypes = {};
	self.errors = buildErrorsObj({
		"404": "Unsupported method",
		"500": "Internal server error",
		"invalidParams": "Invalid request params"
	})

	/**
	 * Позволяет прокинуть кастомный провайдер аутентификации
	 * Для тестирования или использования сторонней инфраструктуры.
	 **/
	function setAuthProvider(provider){
		self.authProvider = provider;
	}

	/**
	 * Позволяет прокинуть кастомные типы чтобы не дублировать модели.
	 **/
	function setCustomTypes(callback){
		const result = callback((new Validator()).getTypes());

		for(let name of Object.keys(result)){
			if(typeof result[name] !== "function"){
				throw new Error("Each custom type should be a function");
			}
		}

		self.customTypes = result;
	}

	/**
	 * Собирает все контроллеры из упрощенной модели и проверяет 
	 * корректность их конфигурации.
	 **/
	function buildControllers(serverParams = {post: [], get: []}){
		if(!serverParams.get){
			serverParams.get = [];
		}

		if(!serverParams.post){
			serverParams.post = [];
		}

		const get = buildEndpoints(serverParams.get);
		const post = buildEndpoints(serverParams.post);

		return {get, post};

		function buildEndpoints(ctrls){
			const result = {};

			ctrls.forEach(function(item){
				validateControllerSchema(item);
				result[item.endpoint] = new Controller(item);
			});

			return result;
		}

		function validateControllerSchema(ctrlDec){
			//todo прописать больше проверок возможно через валидатор
			if(!ctrlDec.reqSchema){
				throw new Error("reqSchema is not specified for", ctrlDec.endpoint);
				process.exit(-1);
			}

			if(!ctrlDec.resSchema){
				throw new Error("resSchema is not specified for", ctrlDec.endpoint);
				process.exit(-1);
			}
		}
	}

	function startServer(serverParams = {post: [], get: []}, {port, name}) {
		const app = express();
		const controllers = buildControllers(serverParams);
		const server = http.createServer(app);

		server.listen(port, function(){
			setMiddlewares();
			app.post('*', onHttpRequest({httpMethod: "POST", controllers}));
			app.get('*', onHttpRequest({httpMethod: "GET", controllers}));
		});

		return {};

		function setMiddlewares(){
			console.log(`${name || "App"} started at ${port}`);

			app.use(bodyParser.json({limit: '1mb'}));
			app.use(bodyParser.urlencoded({limit: '1mb', extended: true}));
			app.use(setHeaders);

			function setHeaders(req, res, next) {
				res.header("Access-Control-Allow-Origin", "*");
				res.header("Access-Control-Allow-Headers", "*");

				next();
			}
		}
	}

	/**
	 * Конструктор контроллера для сборки из общей модели
	 **/
	function Controller(params){
		const ctrl = this;
		const name = getControllerName();
		const validator = new Validator({});
		const types = validator.getTypes();
		const reqModel = params.reqSchema(types, self.customTypes);
		const resModel = params.resSchema(types, self.customTypes);

		ctrl.name = name;
		ctrl.auth = self.authProvider[params.auth];
		ctrl.errors = buildErrorsObj(Object.assign(params.errors, ctrl.auth.errors));
		ctrl.exec = exec;
		ctrl.docs = JSON.parse(JSON.stringify({
			name: name, 
			desc: params.description || "", 
			path: params.endpoint,
			auth: ctrl.auth.description,
			reqSchema: reqModel,
			resSchema: resModel,
			errSchema: ctrl.errors
		}));

		async function exec({body, req, res}){
			try{
				const reqValidator = new Validator({req, res});
				const resValidator = new Validator();
				const isAuthorized = await ctrl.auth.handler({req});
				const isRequestValid = await reqValidator.isValid(reqModel, body);

				if(isAuthorized.success){
					if(isRequestValid.success){
						const validatedResult = await resValidator.isValid(resModel, (
							await params.controller({
								body: isRequestValid.result, 
								auth: isAuthorized.result,
								req: req,
								res: res
							})) || {}
						);

						if(validatedResult.success){
							return validatedResult;
						} else {
							//TODO HealthManager
							console.error(name, "Invalid resSchema:", validatedResult)
							process.exit(-1);
							//throw validatedResult;
						}
					} else {
						throw isRequestValid;
					}
				} else {
					throw isAuthorized;
				}
			} catch(e){
				if(config.debug){
					console.log(e);
				}
				
				if(ctrl.errors[e.message]){
					return ctrl.errors[e.message];
				} else {
					return self.errors["500"];
				}
			}
		}

		function getControllerName() {
			var name = params.endpoint.split("/api/")[1];
			name = name.charAt(0).toUpperCase() + name.slice(1);

			return name;
		}
	}

	/**
	 * Направляет HTTP запрос к нужному контроллеру и запускает его
	 **/
	function onHttpRequest({httpMethod, controllers, verbose = true}){
		return async function(req, res){
			const ctrl = getController({httpMethod, reqPath: req.path, controllers});
			
			if(ctrl){
				const name = ctrl.name;
				const body = (httpMethod === "POST" ? req.body : req.query) || {};
				const response = await ctrl.exec({body, req, res});

				writeLog({httpMethod, response, name, req});

				if(response.success){
					if(isBlob(response.result.blob)){
						const blob = response.result.blob;
						
						res.type(blob.type);
						res.attachment(response.result.filename || "unnamed");
						res.send(Buffer.from(await blob.arrayBuffer()));
					} else {
						res.status(200).send(response);
					}
				} else {
					res.status(200).send(response);
				}
			} else {
				writeLog({httpMethod, req});
				res.status(200).send(self.errors["404"]);
			}

			function isBlob(value){
				return value instanceof Blob || toString.call(value) === '[object Blob]';
			}
		}

		function writeLog({httpMethod, response, name, req}) {
			if(verbose){
				const time = colors.green(getDateTime());
				const ipAddr = getIpAddr(req);
				const isControllerFound = name ? "found: '" + name + "'" : "not found.";
				const errorCode = colors.red(response && response.code ? response.code : "404");
				const resStatus = (response && response.success) ? colors.green("RESOLVE") : errorCode;
		
				console.log(`${time} ${ipAddr} -->`, `${httpMethod} to ${req.path} (Controller ${isControllerFound}) [${resStatus}]`);

				if(config.debug){
					console.log("BODY:", httpMethod === "POST" ? req.body : req.query);
					console.log("RESPONSE:", response);
				}	
			}

			function getDateTime(){
				return `[${new Date().toLocaleString("ru-RU", {timeZone: "Europe/Moscow"})}]`
			}

			function getIpAddr(req){
				if(req.headers && req.headers['x-forwarded-for']){
					return `[${req.headers['x-forwarded-for'].split(",")[0]}]`;
				} else {
					return req.socket && req.socket.remoteAddress ? `[${req.socket.remoteAddress}]` : "[hidden IP]"
				}
			}
		}

		function getController({httpMethod, reqPath, controllers}){
			const httpParsers = {
				"GET": ()=> getRouter(),
				"POST": ()=> defaultRouter(controllers.post)()
			};

			return httpParsers[httpMethod]();

			function getRouter() {
				let name = reqPath;
				let regExp;
				let res = false;
				
				for(let controller in controllers.get) {
					regExp = new RegExp('^' + name + '.*', 'i');

					if(name.search(regExp) !== -1) {
						res = controllers.get[controller];
					}
				}

				return res;
			}

			function defaultRouter(controllers) {
				return () => {
					let name = reqPath;

					if(controllers[name]) {
						controllers[name].name = name;
						return controllers[name];
					} else {
						return false;
					}
				}
			}
		}
	}


	/**
	 * Собирает ошибки из объектов в вид, 
	 * готовый к отправке
	 **/
	function buildErrorsObj(errors){
		const result = {};

		for(let code of Object.keys(errors)){
			result[code] = {
				errored: true,
				code: code,
				text: errors[code]
			}
		}

		return result;
	}
}