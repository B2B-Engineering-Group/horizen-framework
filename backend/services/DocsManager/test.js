import {expect} from "chai";
import bodyParser from 'body-parser';
import express from "express";

export default Test;

function Test({db, ServerManager, Validator, ApiManager, DocsManager}) {
	const config = {
		api_key: "democode",
		microservices: {
			docs_api: "http://127.0.0.1:4112",
		}
	};

	it(`Сбор документации и генерация схем`, async ()=> { 
		const serverManager = new ServerManager({config, Validator});
		const apiManager = new ApiManager({config, Validator, serverManager});
		const docsManager = new DocsManager({config, serverManager, apiManager});

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

		await docsManager.configure({
			name: "test",
			serverManager: serverManager,
			methods: {
				get: [],
				post: [new MockCtrl(), new docsManager.GetModuleSchema()]
			}
		});

		const result = await docsManager.buildModuleSchema();

		//Чтобы сразу проверить и контроллер, значение в котором имеет только полноценность схемы
		//чекаем схему через валидатор.
		const validator = new Validator();
		const isValidSchema = await validator.isValid(docsManager.schema(validator.getTypes(), {}), result);
	
		await docsManager.exportModuleSchema();
		
		expect(isValidSchema.success).to.be.equal(true);
	
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