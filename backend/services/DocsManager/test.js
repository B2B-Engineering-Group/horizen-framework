import {expect} from "chai";
import bodyParser from 'body-parser';
import express from "express";

export default Test;

function Test({db, ServerManager, Validator, ApiManager, DocsManager, HealthManager, DaemonManager}) {
	const config = {
		public_addrs: ["http://127.0.0.1:4112"],
		api_key: "democode",
		microservices: {
			docs_api: "http://127.0.0.1:4112",
		}
	};

	it(`Сбор документации и генерация схем`, async ()=> { 
		const healthManager = new HealthManager({});
    	const daemonManager = new DaemonManager({healthManager});
		const serverManager = new ServerManager({config, Validator});
		const apiManager = new ApiManager({config, Validator, serverManager});
		const docsManager = new DocsManager({config, serverManager, apiManager, daemonManager});

		serverManager.setAuthProvider({
			"bypass": {
				description: "BypassDesc",
				handler: async ()=> ({ success: true, result: {}}),
				errors: {}
			},

			"authorized": {
				description: "AuthorizedDesc",
				handler: async ()=> ({ success: true, result: {}}),
				errors: {"unauthorizedErrorCode": "unauthorizedErrorCodeText"}
			},

			"authorized:app": {
				description: "authorized:app",
				handler: async ()=> ({ success: true, result: {}}),
				errors: {"unauthorizedErrorCode": "unauthorizedErrorCodeText"}
			},
		});

		const intervalId = await daemonManager.setDaemon({
        	name: "Тестовый демон",
        	desc: "Описание для документации",
        	func: async ()=> null, 
        	intervalMs: 300
        });

		apiManager.createRawOne({
			method: "POST",
			microservice: "docs_api",
			endpoint: "/test",
			reqSchema: ({string})=> ({test: string(/[0-9]+/)}),	
			resSchema: ({string})=> ({test: string(/abcd/)})
		});

		apiManager.use("docs_api", {test: "/test"});

		await docsManager.configure({
			name: "test",
			serverManager: serverManager,
			methods: {
				get: [],
				post: [new MockCtrl(), new docsManager.controllers.GetModuleSchema()]
			}
		});

		const result = await docsManager.buildModuleSchema();

		//Чтобы сразу проверить и контроллер, значение в котором имеет только полноценность схемы
		//чекаем схему через валидатор.
		const validator = new Validator();
		const isValidSchema = await validator.isValid(docsManager.schema(validator.getTypes(), {}), result);
		
		await docsManager.exportModuleSchema();
		
		expect(result.daemons[0].name).to.be.equal("Тестовый демон");
		expect(result.daemons[0].desc).to.be.equal("Описание для документации");
		expect(result.integrations[0]).to.be.an("object");
		expect(isValidSchema.success).to.be.equal(true);

		clearInterval(intervalId);
	
		function MockCtrl(){
			return {
				endpoint: "/api/getHello",
				auth: "bypass",
				description: "Тестовый контроллер",
				errors: {
					"testError": "TestErrorDesc"
				},
				
				reqSchema: ({string})=> ({
					reqStr: string(/.+/),
				}),

				resSchema: ({string})=> ({
					resStr: string(/.+/),
				}),

				controller: async function({body, authResult, req, res}){
					return {text: "Hello world!"}
				}
			}	
		}
	});
}