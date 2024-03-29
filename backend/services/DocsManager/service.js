import imaps from 'imap-simple';
import {inspect} from 'util';
import request from "request";
import fs from "fs-extra";
import bodyParser from 'body-parser';
import getRepoInfo from 'git-repo-info';
import getRepoName from 'git-repo-name';
import {packageDirectory} from 'pkg-dir';
import path from "path";


export default DocsManager;

/**
 * Позволяет собрать все схемы запущенного процесса, включая предосталвяемый API, 
 * интеграционные связи с API других модулей, версии и т.д. 
 */
function DocsManager({config, serverManager, apiManager}){
	const self = this;
	let options = null;
	
	self.GetModuleSchema = GetModuleSchema;
	self.buildModuleSchema = buildModuleSchema;
	self.exportModuleSchema = exportModuleSchema;
	self.configure = configure;
	self.schema = ({string, array, object, any}, {})=> ({
		name: string(/.{0,100}/),		
		process: string(/.{0,100}/),
		gitRepoName: string(/.{0,100}/),
		gitRepoVersion: string(/.{0,100}/),
		horizenVersion: string(/.{0,100}/),
		integrations: array(object({
			microservice: string(/.{0,100}/),
			endpoint: string(/.{0,100}/),
			method: string(/.{0,10}/),
			reqSchema: any(), 
			resSchema: any(),
		})),

		api: object({
			post: any(),
			get: any(),
		})
	});

	//[Контроллер] автоматически добавляется в процессы любого типа
	//Отдает полную карту схем модуля. Используется внешними модулями
	//Для CI/CD цикла и аудита.
	function GetModuleSchema(){
		let cache = null;

		return {
			endpoint: "/api/docs",
			auth: "authorized:app",
			description: "Отдает всю документацию по запросу",
			errors: {},
			
			reqSchema: ({}, {})=> ({}),
			resSchema: self.schema,

			controller: async function({body, authResult, req, res}){
				cache = cache || buildModuleSchema(options);

				return cache;
			}
		}
	}

	//Экспортирует полную карту схем модуля в корневую директорию
	//======================================
	//module.schema.min.json - в одну строку
	//module.schema.json - с форматированием
	//======================================
	//В интеграционных модулях, где необходимо работать с большим
	//количеством зависимостей помогает зафиксировать схемы 
	//не прописывая их вручную.
	async function exportModuleSchema(){
		const schema = await buildModuleSchema();
		const dir = await packageDirectory();

		fs.writeFileSync(`${dir}/module.schema.min.json`, JSON.stringify(schema));
		fs.writeFileSync(`${dir}/module.schema.json`, JSON.stringify(schema, "", 4));

		return options;
	}

	function buildModuleSchema(){
		const controllers = serverManager.buildControllers(options.methods);
		const pathArr = process.argv[1].split("/");
		const repoInfo = getRepoInfo();

		return {
			name: options.name,
			process: pathArr[pathArr.length - 2],
			gitRepoName: getRepoName.sync(repoInfo.root),
			gitRepoVersion: repoInfo.abbreviatedSha,
			horizenVersion: options.horizenVersion,
			integrations: extract(apiManager.usedSchemas || {}),
			
			api: {
				post: extract(controllers.post || {}),
				get: extract(controllers.get || {}),
			}
		};

		function extract(obj){
			const result = [];

			Object.keys(obj).forEach(function(key){
				result.push(obj[key].docs);
			});

			return result;
		}
	}

	async function configure(_options){
		options = _options;
		options.horizenVersion = await importHorizenVersion();

		async function importHorizenVersion(){
			const dir = await packageDirectory();

			try{
				return (await import(`${dir}/package.json`, {assert: { type: 'json' }})).default.version;
			} catch(e){
				return "unknown";
			}
		}
	}
}