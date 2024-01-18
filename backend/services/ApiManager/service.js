export default ApiManager;

function ApiManager({config, Validator, serverManager}){
	const self = this;

	self.apis = {};
	self.execs = {};
	self.set = set;

	function set(name, model){		
		//TODO нужное но роняет
		if(!config.microservices || !config.microservices[model.microservice]){
			throw new Error(`${model.microservice} doesn't exists in config.horizen.microservices`);
		}

		if(!config.api_key){
			throw new Error(`Service API key doesn't exists in config.horizen.api_key`);
		}

		const validator = new Validator();
		const types = validator.getTypes();
		const reqSchema = model.reqSchema(types, serverManager.customTypes || {});
		const resSchema = model.resSchema(types, serverManager.customTypes || {});
		const url = config.microservices[model.microservice] + model.endpoint;
		const methods = {post, get};
		const controller = methods[model.method.toLowerCase()];
		
		self.apis[name] = {
			docs: JSON.parse(JSON.stringify({
				name,
				microservice: model.microservice,
				endpoint: model.endpoint,
				reqSchema, resSchema,
				method: model.method.toUpperCase()
			})),

			exec: async (body)=> {
				if(model.method === "get"){
					for(key of body){
						body[key] = `${body[key]}`;
					}
				}

				const isReqValid = await validator.isValid(reqSchema, body);

				if(isReqValid.success){
					const response = await controller(body);

					if(response.success){
						const resValidator = new Validator({ignoreNotDeclaredFields: true});
						const isResValid =  await resValidator.isValid(resSchema, response.result);

						if(isResValid.success){
							return isResValid;
						} else {
							throw isResValid;
						}
					} else {
						throw response;
					}
				} else {
					throw isReqValid;
				}
			}
		}

		self.execs[name] = self.apis[name].exec;

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
			var headers = {};
			var toSend = null;

			if(reqSchema.type === "file"){
				toSend = new FormData();
			    toSend.append('file', body.blob, body.filename);
			} else {
				headers = {'Content-Type': 'application/json'};
				toSend = JSON.stringify(body);
			}
		
			const response = await fetch(url, {
				headers: {
					...headers,
					"api_key": config.api_key 
				},

				method: "POST",
				body: toSend
			});

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

		function getFilename(response){
			const matched = (response.headers.get('Content-Disposition') || "").match(/filename="([^"]+)"/);

			if(matched){
				return matched[1] || "";
			} else {
				return "";
			}
		}
	}
}
