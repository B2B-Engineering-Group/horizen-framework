import {expect} from "chai";
import bodyParser from 'body-parser';
import express from "express";

export default Test;

function Test({db, Validator, AuthManager, ApiManager, ServerManager}){
	var server = null;

	before((done)=> {
		mockAuthApi(done);
	});

	it(`Проверка получения токена по коду`, (done)=> { 
		request({req: {
			path: "/api/exchangeCode",
			body: {code: "code"}
		}, onResponse: (responseData)=> {
			expect(!!responseData.result.token).to.be.equal(true);
			done();
		} })
	});

	it(`Проверка получения кода по токену`, (done)=> { 
		request({httpMethod: "POST", req: {
			path: "/api/exchangeToken",
			body: {token: "token"}
		}, onResponse: (responseData)=> {
			expect(!!responseData.result.code).to.be.equal(true);
			done();
		} })
	});
	
	it(`Проверка авторизации для пользователя`, (done)=> { 
		request({httpMethod: "POST", req: {
			path: "/api/microAuth",
			body: {}
		}, onResponse: (responseData)=> {
			expect(!!responseData.result.auth.userId).to.be.equal(true);
			done();
		} })
	});

	it(`Проверка авторизации для микросервиса`, (done)=> { 
		request({httpMethod: "POST", req: {
			path: "/api/userAuth",
			body: {}
		}, onResponse: (responseData)=> {
			expect(!!responseData.result.auth.appId).to.be.equal(true);
			done();
		} })
	});

	function request({req, onResponse}){
		const config = {
			name: "test", 
			api_key: "democode",
			microservices: {
				auth_api: "http://127.0.0.1:4111"
			}
		};

		const serverManager = new ServerManager({config, Validator});
		const apiManager = new ApiManager({config, Validator, serverManager});
		const authManager = new AuthManager({config, apiManager});

		serverManager.setAuthProvider(authManager.authStrategies);

		const controllers = serverManager.buildControllers({ 
			post: [
				new authManager.controllers.ExchangeToken(),
				new authManager.controllers.ExchangeCode(),
				new MockMicroserviceAuth(),
				new MockUserAuth()
			]	
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

		serverManager.onHttpRequest({httpMethod: "POST", controllers, verbose: false})(req, res);
	}

	function MockMicroserviceAuth(){
		return {
			endpoint: "/api/microAuth",
			auth: "authorized",
			description: "",
			errors: {},
			
			reqSchema: ({})=> ({}),
			resSchema: ({any})=> ({auth: any()}),

			controller: async function({body, auth}){
				return {auth}
			}
		}	
	}

	function MockUserAuth(){
		return {
			endpoint: "/api/userAuth",
			auth: "authorized:server",
			description: "",
			errors: {},
			
			reqSchema: ({})=> ({}),
			resSchema: ({any})=> ({auth: any()}),

			controller: async function({body, auth}){
				return {auth}
			}
		}	
	}


	function mockAuthApi(done){
		const app = express();

		app.use(bodyParser.json({limit: '1mb'}));
		app.use(bodyParser.urlencoded({limit: '1mb', extended: true}));

		server = app.listen(4111, async function(){
			app.post('/api/getTokenByCode', async (req, res) => {
				res.status(200).send({success: true, result: {token: "token"}})
			});

			app.post('/api/getCodeByToken', async (req, res) => {
				res.status(200).send({success: true, result: {code: "code"}})
			});

			app.post('/api/verifyRequest', async (req, res) => {
				if(req.body.token){
					res.status(200).send({
						success: true, 
						result: {userId: 1}
					});
				} 

				else if(req.body.api_key && req.body.api_key_subject){
					res.status(200).send({
						success: true, 
						result: {appId: 1}
					});
				}				
			});

			done();
		});
	}
}