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

	it(`Проверка отправки документации`, (done)=> { 
		const serverManager = new ServerManager({config, Validator});
		const apiManager = new ApiManager({config, Validator, serverManager});
		const docsManager = new DocsManager({config, serverManager, apiManager});

		serverManager.setAuthProvider({
			bypass: {
				description: "BypassDesc",
				handler: async ()=> ({ success: true, result: {}}),
				errors: {}
			},

			authorized: {
				description: "AuthorizedDesc",
				handler: async ()=> ({ success: true, result: {}}),
				errors: {"unauthorizedErrorCode": "unauthorizedErrorCodeText"}
			},
		});

		const app = express();

		app.use(bodyParser.json({limit: '1mb'}));
		app.use(bodyParser.urlencoded({limit: '1mb', extended: true}));

		const server = app.listen(4112, async function(){
			app.post('/api/setDocs', (req, res) => {
				res.status(200).send({success: true, result: {}})
			});

			await docsManager.publish({
				serverManager: serverManager,
				horizenVersion: "horizenVersion",
				name: "moduleName",
				version: "gitVersion",
				methods: {
					get: [],
					post: [new MockCtrl()]
				}
			});


			server.close();
			done();
		});
	});

	it(`Проверка демона отправки документации [ошибки]`, async ()=> { 
		const serverManager = new ServerManager({config, Validator});
		const apiManager = new ApiManager({config, Validator, serverManager});
		const docsManager = new DocsManager({config, serverManager, apiManager});

		let count = 0;

		docsManager.publish = async () => {
			count += 1;
			throw new Error(500);
		}

		docsManager.initDocsPusher({}, 100);
		await wait(1000);

		expect(count > 1 && count <= 10).to.equal(true);
	})

	it(`Проверка демона отправки документации [успех с пятой попытки]`, async ()=> { 
		const serverManager = new ServerManager({config, Validator});
		const apiManager = new ApiManager({config, Validator, serverManager});
		const docsManager = new DocsManager({config, serverManager, apiManager});

		let count = 0;

		docsManager.publish = async () => {
			count += 1;

			if(count === 5){
				return true;
			}else{
				throw new Error(500);
			}
		}

		docsManager.initDocsPusher({}, 100);
		await wait(1000);

		expect(count > 1 && count === 5).to.equal(true);
	})

	function wait(ts){
		return new Promise((resolve) => {
			setTimeout(resolve, ts)
		})
	}

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
}