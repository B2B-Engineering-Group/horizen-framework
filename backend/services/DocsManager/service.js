import {inspect} from 'util';
import fs from "fs-extra";
import bodyParser from 'body-parser';
import getRepoInfo from 'git-repo-info';
import {packageDirectory} from 'pkg-dir';
import path from "path";

export default DocsManager;

/**
 * Собирает все схемы запущенного процесса, включая предосталвяемый API, 
 * связи с API других модулей, версии, бизнес-цепочки (демоны) и т.д.
 * 
 * Генерирует всю схему модуля. Помогает выявить проблемы на этапе интеграции, 
 * контролировать состояние модулей.
 */
function DocsManager({config, serverManager, apiManager, daemonManager}){
	const self = this;
	let options = null;
	
	self.controllers = {GetModuleSchema};
	self.buildModuleSchema = buildModuleSchema;
	self.exportModuleSchema = exportModuleSchema;
	self.configure = configure;
	self.schema = ({string, array, object, any, number}, {})=> ({
		container: string(/.{0,100}/),		
		addrs: array(string(/.{0,200}/)),

		gitRepoVersion: string(/.{0,100}/),
		horizenVersion: string(/.{0,100}/),
		daemons:  array(object({
			name: string(/.{0,100}/),
			desc: string(/.{0,300}/),
			intervalMs: number(/[0-9]{1,100}/)
		})),

		integrations: array(object({
			container: string(/.{0,100}/),
			addr: string(/.{0,200}/),
			endpoint: string(/.{0,300}/),
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
				cache = cache || buildModuleSchema();

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
		const startedProcess = pathArr[pathArr.length - 2];
		const repoInfo = getRepoInfo();

		return {
			container: options.name,
			addrs: config.public_addrs || [],

			gitRepoVersion: repoInfo.abbreviatedSha,
			horizenVersion: options.horizenVersion,
			daemons: extractDaemons(),
			integrations: extractIntegrations(),
			
			api: {
				post: extract(controllers.post || {}),
				get: extract(controllers.get || {}),
			}
		};

		function extractDaemons(){
			return Object.keys(daemonManager.daemons).map((name)=> {
				const {desc, intervalMs} = daemonManager.daemons[name];

				return {name, desc, intervalMs};
			})
		}

		function extractIntegrations(){
			return Object.values(apiManager.usedSchemas)
				.map((item)=> Object.values(item)).flat()
				.map((item)=> Object.values(item)).flat()
				.map((item)=> item.docs)
		}

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
			try{
				const dir = await packageDirectory();

				return (await import(`${dir}/.horizen-framework/package.json`, {assert: { type: 'json' }})).default.version;
			} catch(e){
				return "unknown";
			}
		}
	}
}