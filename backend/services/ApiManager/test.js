import express from "express";
import {expect} from "chai";
import { Blob } from "buffer";
import bodyParser from 'body-parser';
import { Readable } from 'node:stream';

export default Test;

function Test({db, Validator, ApiManager, ServerManager}) {
	it(`Парсим схему из документации модуля`, (done)=> {
	
		const config = {microservices: {"test_api": `http://127.0.0.1:1111`}, api_key: "democode"};
		const serverManager = new ServerManager({config, Validator});
		const api = new ApiManager({config, Validator, serverManager});
		
		api.createFromSchema("test_api", {
	        "microservice": "test_api",
	        "process": "bin",
	        "version": "gitVersion",
	        "horizenVersion": "horizenVersion",
	        "integrations": [],
	        "api": {
	            "post": [
	                {
	                    "name": "GetHello",
	                    "desc": "Тестовый контроллер",
	                    "path": "/test",
	                    "auth": "BypassDesc",
	                    "reqSchema": {
	                        "reqStr": {
	                            "type": "string",
	                            "schema": "^(.+)$",
	                            "isOptional": false
	                        }
	                    },
	                    "resSchema": {
	                        "resStr": {
	                            "type": "string",
	                            "schema": "^(.+)$",
	                            "isOptional": false
	                        }
	                    },
	                    "errSchema": {
	                        "testError": {
	                            "errored": true,
	                            "code": "testError",
	                            "text": "TestErrorDesc"
	                        }
	                    }
	                }
	            ],
	            "get": []
	        }
	    });

		expect(api.use("test_api", {test: "/test"}).test).to.be.a("function");

		done();
	});


	it(`[GET] Отправить JSON / Получить JSON`, (done)=> { 
		const port = 3334;
		const app = express();
		const config = {microservices: {"test_api": `http://127.0.0.1:${port}`}, api_key: "democode"};
		const serverManager = new ServerManager({config, Validator});
		const api = new ApiManager({config, Validator, serverManager});

		api.createRawOne({
			method: "GET",
			microservice: "test_api",
			endpoint: "/test",
			reqSchema: ({string})=> ({test: string(/[0-9]+/)}),	
			resSchema: ({string})=> ({test: string(/abcd/)})
		});

		const {call} = api.use("test_api", {call: {path: "/test", method: "get"}});

		const server = app.listen(port, async function(){
			app.use(bodyParser.json({limit: '1mb'}));
			app.use(bodyParser.urlencoded({limit: '1mb', extended: true}));
			app.get('/test', async (req, res) => {
				const validator = new Validator({req, res});
				const {string} = validator.getTypes();
				const correct = await validator.isValid({
					test: string(/[0-9]+/)
				}, req.query);
				
				try{
					expect(!!correct.success).to.be.equal(true);

					res.status(200).send({
						success: true,
						result: {test: "abcd", ignored: true}
					});
				} catch(e){
					done(e);
				}
			});

			sendRequest();

			function sendRequest(){
				return new Promise(async function(){
					try{
						const result = await call({test: "3"});
						expect(result.success).to.be.equal(true);
						server.close();
						done();
					} catch(e){
						console.log(e);
						done(e);
					}
				})
			}
		});
	});

	it(`[POST] Отправить File / Получить JSON`, (done)=> { 
		const port = 3331;
		const app = express();
		const config = {microservices: {"test_api": `http://127.0.0.1:${port}`}, api_key: "democode"};
		const serverManager = new ServerManager({config, Validator});
		const api = new ApiManager({config, Validator, serverManager});
	
		api.createRawOne({
			method: "POST",
			microservice: "test_api",
			endpoint: "/test",

			reqSchema: ({file})=> (file({
				maxSizeMb: 1, 
				mimetypes: ["*"]
			})),	

			resSchema: ({string})=> ({})
		});

		const {call} = api.use("test_api", {call: "/test"});

		const server = app.listen(port, async function(){
			app.use(bodyParser.json({limit: '1mb'}));
			app.use(bodyParser.urlencoded({limit: '1mb', extended: true}));
			app.post('/test', async (req, res) => {
				const validator = new Validator({req, res});
				const {file} = validator.getTypes();
				
				const correct = await validator.isValid(file({
					maxSizeMb: 1, 
					mimetypes: ["*"]
				}), req.body);
				
				try{
					expect(!!correct.success).to.be.equal(true);
					expect(correct.result.blob.type).to.be.equal("text");
					expect(await correct.result.blob.text()).to.be.equal("test1");

					res.status(200).send({success: true, result: {}});
				} catch(e){
					done(e);
					server.close();
				}
			});

			sendRequest();

			function sendRequest(){
				return new Promise(async function(){
					try{
						const result = await call({blob: new Blob(["test1"], {type: "text"}), filename: "test.txt"});

						expect(result.success).to.be.equal(true);
						server.close();
						done();
					} catch(e){
						console.log(e);
						done(e);
					}
				})
			}
		});
	});

	it(`[POST] Отправить File / Получить File`, (done)=> { 
		const port = 3336;
		const app = express();
		const config = {microservices: {"test_api": `http://127.0.0.1:${port}`}, api_key: "democode"};
		const serverManager = new ServerManager({config, Validator});
		const api = new ApiManager({config, Validator, serverManager});
	
		api.createRawOne({
			method: "POST",
			microservice: "test_api",
			endpoint: "/test",
			reqSchema: ({file})=> (file({
				maxSizeMb: 1, 
				mimetypes: ["*"]
			})),	

			resSchema: ({file})=> (file())
		});

		const {call} = api.use("test_api", {call: "/test"});

		const server = app.listen(port, async function(){
			app.use(bodyParser.json({limit: '1mb'}));
			app.use(bodyParser.urlencoded({limit: '1mb', extended: true}));
			app.post('/test', async (req, res) => {
				const validator = new Validator({req, res});
				const {file} = validator.getTypes();
				
				const correct = await validator.isValid(file({
					maxSizeMb: 1, 
					mimetypes: ["*"]
				}), req.body);
				
				try{
					expect(!!correct.success).to.be.equal(true);
					expect(correct.result.blob.type).to.be.equal("text");
					expect(await correct.result.blob.text()).to.be.equal("test1");

					const blob = new Blob(["test2"], {type: "text/plain"});
				
					res.type(blob.type);
					res.attachment("file.png");

					blob.arrayBuffer().then((buf) => {
					    res.send(Buffer.from(buf));
					});
				} catch(e){
					done(e);
					server.close();
				}
			});

			sendRequest();

			function sendRequest(){
				return new Promise(async function(){
					try{	

						const response = await call({blob: new Blob(["test1"], {type: "text"}), filename: "test.txt"});
						expect(await response.result.blob.text()).to.be.equal("test2")
						expect(response.success).to.be.equal(true);
						server.close();
						done();
					} catch(e){
						done(e);
					}
				})
			}
		});
	});

	it(`[POST] Отправить JSON / Получить JSON`, (done)=> { 
		const port = 3332;
		const app = express();
		const config = {microservices: {"test_api": `http://127.0.0.1:${port}`}, api_key: "democode"};
		const serverManager = new ServerManager({config, Validator});
		const api = new ApiManager({config, Validator, serverManager});
	
		api.createRawOne({
			method: "POST",
			microservice: "test_api",
			endpoint: "/test",
			reqSchema: ({boolean})=> ({test: boolean()}),	
			resSchema: ({string})=> ({test: string(/abcd/)})
		});

		const {call} = api.use("test_api", {call: "/test"});

		const server = app.listen(port, async function(){
			app.use(bodyParser.json({limit: '1mb'}));
			app.use(bodyParser.urlencoded({limit: '1mb', extended: true}));
			app.post('/test', async (req, res) => {
				const validator = new Validator({req, res});
				const {boolean} = validator.getTypes();
				const correct = await validator.isValid({
					test: boolean()
				}, req.body);
				
				try{
					expect(!!correct.success).to.be.equal(true);

					res.status(200).send({
						success: true,
						result: {test: "abcd"}
					});
				} catch(e){
					server.close();
					done(e);
				}
			});

			sendRequest();

			function sendRequest(){
				return new Promise(async function(){
					try{
						const result = await call({test: true});
						expect(result.success).to.be.equal(true);
						server.close();
						done();
					} catch(e){
						done(e);
					}
				})
			}
		});
	});

	it(`[GET] Отправить JSON / Получить File`, (done)=> { 
		const port = 3335;
		const app = express();
		const config = {microservices: {"test_api": `http://127.0.0.1:${port}`}, api_key: "democode"};
		const serverManager = new ServerManager({config, Validator});
		const api = new ApiManager({config, Validator, serverManager});
	
		api.createRawOne({
			method: "GET",
			microservice: "test_api",
			endpoint: "/test",
			reqSchema: ({boolean})=> ({test: boolean()}),	
			resSchema: ({file})=> (file({mimetypes: ["image/png"]}))
		});

		const {call} = api.use("test_api", {call: {path: "/test", method: "get"}});

		const server = app.listen(port, async function(){
			app.use(bodyParser.json({limit: '1mb'}));
			app.use(bodyParser.urlencoded({limit: '1mb', extended: true}));

			app.get('/test', async (req, res) => {
				const blob = new Blob(["test1"], {type: "text/plain"});
				
				res.type(blob.type);
				res.attachment("file.png");

				blob.arrayBuffer().then((buf) => {
				    res.send(Buffer.from(buf));
				});
			});

			sendRequest();

			function sendRequest(){
				return new Promise(async function(){
					try{
						const response = await call({test: true});
						expect(await response.result.blob.text()).to.be.equal("test1")
						expect(response.success).to.be.equal(true);
						server.close();
						done();
					} catch(e){
						done(e);
					}
				})
			}
		});
	});
}
