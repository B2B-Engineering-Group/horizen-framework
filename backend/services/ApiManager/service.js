export default ApiManager;

/** 
 * Единый интерфейс для кросс-микросервисных взаимодействий. 
 * Инкапсулирует передачу токенов/проверку схем.
 */
function ApiManager({config, Validator, serverManager, healthManager}){
	const self = this;
	const externalSchemas = {};
	let locked = false; 

	self.usedSchemas = {};
	self.createFromSchema = createFromSchema;
	self.createRawOne = createRawOne;
	self.lock = ()=> locked = true;
	self.use = use;

	//Парсит API из импортированной документации и подготовливает модель.
	//При этом перетирает все схемы для указанного модуля.
	function createFromSchema(name, moduleSchema){
		externalSchemas[name] = parseEndpoints(moduleSchema);

		function parseEndpoints(moduleSchema){
			const result = {};
			const apis = moduleSchema.api;

			for(let method of Object.keys(apis)){
				for(let endpoint of apis[method]){
					result[method] = result[method] || {};
					result[method][endpoint.path] = buildInterfaceModel({
				 		method: method.toUpperCase(),
				 		microservice: name,
				 		endpoint: endpoint.path,
				 		reqSchema: ()=> endpoint.reqSchema,	
				 		resSchema: ()=> endpoint.resSchema,	
				   });
				}
			}

			return result;
		}
	}

	//Добавляет/заменяет интерфейсы, не перетирая схему указанного модуля.
	function createRawOne(model){
	
		const name = model.microservice;
		const method = model.method.toLowerCase();
		const path = model.endpoint;
		const schema = buildInterfaceModel(model);

		externalSchemas[name] = externalSchemas[name] || {};	
		externalSchemas[name][method] = externalSchemas[name][method] || {};
		externalSchemas[name][method][path] = schema;
	}

	/*
	 *  Декларирует используемые API интерфейсы, может вызываться многократно, 
	 *  но до инициализации (т.е до того как сревер начал слушать).
	 *  
	 *  Необходимо использовать через замыкание. Все используемые интерфейсы 
	 *  попадут в документацию в блок интеграций. В результате вернет набор 
	 *  функций для вызовов.
	 *
	 *	const {getUsers, getSomething} = api.use("api_manager",  {
	 *		getUsers: "/api/getUser",//Короткая форма для post, т.к их 99%
	 *		getSomething: {method: "get", path: "/api/getUser"} //Кейс для точного указания метода (полная форма)
	 *	}); 
     *
	 *  const res = await getUsers(body);
	 *  //{success: true, result: {}} или {errored: true, ...}
	*/
	function use(name, endpoints){
		const result = {};

		if(locked){
			doFatalError(`[ApiManager] Is not allowed to declare used interfaces after the module startup.`);
		} else {
			isModuleSchemaExists();
			self.usedSchemas[name] = self.usedSchemas[name] || {}; 

			for(let key of Object.keys(endpoints)){
				const schemas = self.usedSchemas;
				const params = fixParams(endpoints[key]);
				const model = ensureEndpoint(params);
				
				result[key] = model.call;
				schemas[name][params.method] = schemas[name][params.method] || {};
				schemas[name][params.method][key] = model;
			}
		}

		return result;

		function ensureEndpoint(params){
			const model = getInterfaceModel();

			if(!model){
				doFatalError(`
					[ApiManager] Schema for interface ${JSON.stringify(params)} are not declared for "${name}". 
					If schema declared but API method is not POST, use long form like mentioned above.
				`);
			}

			return model;

			function getInterfaceModel(){
				try{
					return externalSchemas[name][params.method][params.path];
 				} catch(e){
 					return null;
 				}
			}
		}

		function fixParams(params){
			if(typeof params === "object"){
				return {path: params.path, method: params.method.toLowerCase()};
			} else {
				return {path: params, method: "post"}
			}
		}

		function isModuleSchemaExists(){
			if(!externalSchemas[name]){
				doFatalError(`[ApiManager] External module schema "${name}" does not exists;`);
			}
		}

		function doFatalError(text){
			try{
				throw new Error(text)
			}catch(e){
				console.log(e);
				process.exit(1);
			}
		}
	}


	/** 
	 * Позволяет подготовить один API интерфейс внешнего микросервиса, 
	 * вручную добавив схему запроса и ответа. Если схема запроса не 
	 * соответствует переданному body, вернет ошибку
	 * 
	 * А вот схема ответа является проекцией. При валидации вернет ошибку
	 * только если указанное в схеме поле не прошло валидацию. Все поля 
	 * которые не указаны в схеме ответа будут проигнорированы и исключены.
	 * 
	 *  model: {
	 *		method: "POST",
	 *		microservice: "auth_api",
	 *		endpoint: "/api/getCodeByToken",
	 *		reqSchema: ({}, {})=> ({}),	
	 * 		resSchema: ({}, {})=> ({}),	
	 *  }
	 **/
	function buildInterfaceModel(model){		
		validateEnviroment(model);

		const validator = new Validator();
		const types = validator.getTypes();
		const reqSchema = model.reqSchema(types, serverManager.customTypes || {});
		const resSchema = model.resSchema(types, serverManager.customTypes || {});
		const url = config.microservices[model.microservice] + model.endpoint;
		const methods = {post, get};
		const controller = methods[model.method.toLowerCase()];
		const docsJson = getDocsJSON();

		return {
			docs: docsJson,
			call: runReuqest
		};

		//Общий порядок запроса
		async function runReuqest(body){
			const timeStart = Date.now();

			if(model.method === "get"){
				paramsToString();
			}

			if(validateRequestSchema()){
				const response = await controller(body);

				if(response.success){
					const isValid = await validateResponseSchema(response);

					if(isValid.success){
						healthManager.log({
							scope: "integration",
							type: "success",
							name: url,
							details: JSON.stringify({time: Date.now() - timeStart})
						});
					} else {
						healthManager.log({
							scope: "integration",
							type: "error",
							name: url,
							details: JSON.stringify(isValid)
						});
					}

					return isValid;
				} else {
					healthManager.log({
						scope: "integration",
						type: "warning",
						name: url,
						details: JSON.stringify({error: response})
					});

					throw response;
				}
			}

			async function validateResponseSchema(response){
				const resValidator = new Validator({ignoreNotDeclaredFields: true});
				const isResValid =  await resValidator.isValid(resSchema, response.result);

				if(isResValid.success){
					return isResValid;
				} else {
					throw isResValid;
				}
			}

			async function validateRequestSchema(){
				const isReqValid = await validator.isValid(reqSchema, body);

				if(isReqValid.success){
					return true;
				} else {
					throw isReqValid;
				}
			}

			function paramsToString(){
				for(key of body){
					body[key] = `${body[key]}`;
				}
			}
		}

		function getDocsJSON(){
			const name = getLocalMcName(config.microservices[model.microservice]);
		
			return JSON.parse(JSON.stringify({
				container: name,
				addr: config.microservices[model.microservice],
				method: model.method.toLowerCase(),
				endpoint: model.endpoint,
				reqSchema, resSchema,
			}));

			function getLocalMcName(addr){
				const isPublic = addr.match(".");

				if(isPublic){
					return "external";
				} else {
					return addr.replace("http://", "").split(":")[0] || "external";
				}
			}
		}

		async function get(body){
			const response = await fetch(`${url}?${new URLSearchParams(body).toString()}`);
			
			if(resSchema.type === "file"){
				const blob = await response.blob();
				
				return {
					success: true,
					result: {blob, filename: getFilename(response)}
				}
			} else {
				return await response.json();
			}
		}

		async function post(body){
			const options = ensureOptions();
	
			return await standartiseResponse(await fetch(url, {
				headers: {
					...options.headers,
					"api_key": config.api_key 
				},

				method: "POST",
				body: options.body
			}));

			function ensureOptions(){
				let headers = {};
				let _body = null;

				if(reqSchema.type === "file"){
					_body = new FormData();
				    _body.append('file', body.blob, body.filename);
				} else {
					headers = {'Content-Type': 'application/json'};
					_body = JSON.stringify(body);
				}

				return {headers, body: _body};
			}
	
			//TODO fixme
			// вероятно тут бага если файл будет JSON ошибкой, то он пройдет
			async function standartiseResponse(response){
				if(resSchema.type === "file"){
					const blob = await response.blob();
					
					return {
						success: true,
						result: {blob, filename: getFilename(response)}
					}
				} else {
					return await response.json();
				}
			}
		}

		function getFilename(response){
			const matched = (response.headers.get('Content-Disposition') || "").match(/filename="([^"]+)"/);

			if(matched){
				return matched[1] || "";
			} else {
				return "";
			}
		}
	}

	//Помогает при миграциях старых модулей на обновленный фреймворк
	function validateEnviroment(model){
		if(!config.microservices || !config.microservices[model.microservice]){
			throw new Error(`${model.microservice} doesn't exists in config.horizen.microservices`);
		}

		if(!config.api_key){
			throw new Error(`Service API key doesn't exists in config.horizen.api_key`);
		}

		if(typeof model !== "object" || !model){
			throw new Error(`addRemoteAPI, invalid params specified. Expected options object;`, model);
		}
	}
}