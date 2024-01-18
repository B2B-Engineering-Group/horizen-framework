import {expect} from "chai";

export default Test;

function Test({db, ServerManager, Validator, mongoManager}) {
	it(`Проверка GET контроллера`, (done)=> { 
		request({httpMethod: "GET", req: {
			path: "/api/getHello",
			body: {}
		}, mockController, onResponse: (responseData)=> {
			expect(responseData.result.text).to.be.equal("Hello world!")
			done();
		} })
	});

	it(`Проверка POST контроллера`, (done)=> { 
		request({httpMethod: "POST", req: {
			path: "/api/getHello",
			body: {}
		}, mockController, onResponse: (responseData)=> {
			expect(responseData.result.text).to.be.equal("Hello world!")
			done();
		} })
	});

	it(`Проверка несуществующего POST контроллера`, (done)=> { 
		request({httpMethod: "POST", req: {
			path: "/api/getHello",
			body: {}
		}, mockController: null, onResponse: (responseData)=> {
			expect(responseData.code).to.be.equal("404")
			done();
		} })
	});

	it(`Проверка несуществующего GET контроллера`, (done)=> { 
		request({httpMethod: "POST", req: {
			path: "/api/getHello",
			body: {}
		}, mockController: null, onResponse: (responseData)=> {
			expect(responseData.code).to.be.equal("404")
			done();
		} })
	});

	it(`Проверка необработанной ошибки в контроллере`, (done)=> { 
		request({httpMethod: "POST", req: {
			path: "/api/getHello",
			body: {}
		}, mockController: mockErrorController, onResponse: (responseData)=> {
			expect(responseData.code).to.be.equal("500")
			done();
		} })
	});

	it(`Проверка заготовленной ошибки в контроллере`, (done)=> { 
		request({httpMethod: "POST", req: {
			path: "/api/getHello",
			body: {}
		}, mockController: mockCustomErrorController, onResponse: (responseData)=> {
			expect(responseData.code).to.be.equal("customError")
			done();
		} })
	});

	function request({httpMethod, req, onResponse, mockController}){
		const serverManager = new ServerManager({
			config: {name: "test"}, Validator
		});

		serverManager.setAuthProvider({
			bypass: {
				description: "test",
				handler: async ()=> ({success: true, result: {}})
			}
		});

		const controllers = serverManager.buildControllers({ 
			...(mockController ? {[httpMethod.toLowerCase()]: [mockController({})]} : {})
		});

		const res = {
			status: (statusData)=> {
				return {
					send: (responseData)=> {
						onResponse(responseData)
					}
				}
			}
		}

		serverManager.onHttpRequest({httpMethod, controllers, verbose: false})(req, res);
	}

	function mockCustomErrorController({}){
		return {
			endpoint: "/api/getHello",
			auth: "bypass",
			description: "Тестовый контроллер с ошибкой",
			errors: {
				"customError": "Какая-то кастомная ошибка"
			},
			
			reqSchema: (common)=> ({}),
			resSchema: ({string}, {})=> ({
				text: string(/.+/)
			}),

			controller: async function({body, authResult, req, res}){
				throw new Error("customError");
			}
		}	
	}

	function mockErrorController({}){
		return {
			endpoint: "/api/getHello",
			auth: "bypass",
			description: "Тестовый контроллер с ошибкой",
			errors: {},
			
			reqSchema: (common)=> ({}),
			resSchema: ({string}, {})=> ({
				text: string(/.+/)
			}),

			controller: async function({body, authResult, req, res}){
				throw new Error();
			}
		}	
	}

	function mockController({}){
		return {
			endpoint: "/api/getHello",
			auth: "bypass",
			description: "Тестовый контроллер",
			errors: {},
			
			reqSchema: (common)=> ({}),
			resSchema: ({string}, {})=> ({
				text: string(/.+/)
			}),

			controller: async function({body, authResult, req, res}){
				return {text: "Hello world!"}
			}
		}	
	}
}