import express from "express";
import {expect} from "chai";
import { Blob } from "buffer";
import bodyParser from 'body-parser';
import { Readable } from 'node:stream';

export default Test;

function Test({db, Validator, ApiManager, ServerManager}) {
	it(`[POST] Отправить File / Получить JSON`, (done)=> { 
		const port = 3331;
		const app = express();
		const config = {microservices: {"test_api": `http://127.0.0.1:${port}`}, api_key: "democode"};
		const serverManager = new ServerManager({config, Validator});
		const apiManager = new ApiManager({config, Validator, serverManager});
	
		apiManager.set("postFile", {
			method: "POST",
			microservice: "test_api",
			endpoint: "/test",
			reqSchema: ({file})=> (file({
				maxSizeMb: 1, 
				mimetypes: ["*"]
			})),	

			resSchema: ({string})=> ({})
		});

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
						const result = await apiManager.apis.postFile.exec({blob: new Blob(["test1"], {type: "text"}), filename: "test.txt"});
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

	it(`[POST] Отправить File / Получить File`, (done)=> { 
		const port = 3336;
		const app = express();
		const config = {microservices: {"test_api": `http://127.0.0.1:${port}`}, api_key: "democode"};
		const serverManager = new ServerManager({config, Validator});
		const apiManager = new ApiManager({config, Validator, serverManager});
	
		apiManager.set("postFile", {
			method: "POST",
			microservice: "test_api",
			endpoint: "/test",
			reqSchema: ({file})=> (file({
				maxSizeMb: 1, 
				mimetypes: ["*"]
			})),	

			resSchema: ({file})=> (file())
		});

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
						const response = await apiManager.apis.postFile.exec({blob: new Blob(["test1"], {type: "text"}), filename: "test.txt"});
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
		const apiManager = new ApiManager({config, Validator, serverManager});
	
		apiManager.set("postJson", {
			method: "POST",
			microservice: "test_api",
			endpoint: "/test",
			reqSchema: ({boolean})=> ({test: boolean()}),	
			resSchema: ({string})=> ({test: string(/abcd/)})
		});

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
						const result = await apiManager.apis.postJson.exec({test: true});
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

	it(`[GET] Отправить JSON / Получить JSON`, (done)=> { 
		const port = 3334;
		const app = express();
		const config = {microservices: {"test_api": `http://127.0.0.1:${port}`}, api_key: "democode"};
		const serverManager = new ServerManager({config, Validator});
		const apiManager = new ApiManager({config, Validator, serverManager});
		
		apiManager.set("getJson", {
			method: "GET",
			microservice: "test_api",
			endpoint: "/test",
			reqSchema: ({string})=> ({test: string(/[0-9]+/)}),	
			resSchema: ({string})=> ({test: string(/abcd/)})
		});

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
						const result = await apiManager.apis.getJson.exec({test: "3"});
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
		const apiManager = new ApiManager({config, Validator, serverManager});
	
		apiManager.set("getFile", {
			method: "GET",
			microservice: "test_api",
			endpoint: "/test",
			reqSchema: ({boolean})=> ({test: boolean()}),	
			resSchema: ({file})=> (file({mimetypes: ["image/png"]}))
		});

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
						const response = await apiManager.apis.getFile.exec({test: true});
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
