import imaps from 'imap-simple';
import {inspect} from 'util';
import request from "request";
import fs from "fs-extra";
import bodyParser from 'body-parser';
import path from "path";

export default DocsManager;

/**
 * Functions for testing, profiling, documentation and etc
 * @param {object} options.config of module
 */
function DocsManager({config, serverManager, apiManager}){
	const self = this;
	
	if(config.microservices && config.microservices.docs_api){
		apiManager.set("publishDocs", {
			method: "POST",
			microservice: "docs_api",
			endpoint: "/api/setDocs",
			reqSchema: ({string, object, any, array}, {})=> ({
				name: string(/.{0,100}/),
				process: string(/.{0,100}/),
				version: string(/.{0,100}/),
				horizenVersion: string(/.{0,100}/),
				readme: string(/.{0,5000}/),

				controllers: object({
					post: any(),
					get: any(),
				}),

				declaredApis: array(object({
					name: string(/.{0,100}/),
					microservice: string(/.{0,100}/),
					endpoint: string(/.{0,100}/),
					method: string(/.{0,10}/),
					reqSchema: any(), 
					resSchema: any(),
				}))
			}),	

			resSchema: ({})=> ({})
		});
	}

	self.initDocsPusher = initDocsPusher;
	self.publish = publish;

	// стучит до успеха
	function initDocsPusher(options, period = 60000){
		if(!config.microservices || !config.microservices.docs_api){
			return null;
		}

		const self = this;
		setTimeout(sendDosc, period);

		async function sendDosc(){
			try{
				await self.publish(options)
			}catch(e){
				console.log("DOCS SENDING ERROR", e);
				setTimeout(sendDosc, period);
			}
		}
	}

	//Нужно прокинуть версию хорайзена
	//Нужно научить хорайзен срать в логи при выпадении подобных ошибок
	
	async function publish(options){
		try{//TODO это нужно переписать под новый формат api
			const docs = generate();
			await apiManager.apis.publishDocs.exec(docs);
		} catch(e){
			throw e;
		}

		function generate(){
			const controllers = serverManager.buildControllers(options.methods);
			const pathArr = process.argv[1].split("/");
	
			return {
				name: options.name,
				process: pathArr[pathArr.length - 2],
				version: options.version,
				horizenVersion: options.horizenVersion,
				declaredApis: extractDocs(apiManager.apis || {}),
				
				controllers: {
					post: extractDocs(controllers.post || {}),
					get: extractDocs(controllers.get || {}),
				},

				readme: getReadme()
			};

			function getReadme(){
				try{
					return fs.readFileSync(`${path.resolve('.')}/README.md`).toString()
				} catch(e){
					return "README.md doesn't exists";
				}
			}

			function extractDocs(obj){
				const result = [];

				Object.keys(obj).forEach(function(key){
					result.push(obj[key].docs);
				});

				return result;
			}
		}
	}
}