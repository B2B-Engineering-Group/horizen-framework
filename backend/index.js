import MongoManager from "./services/MongoManager/service.js";
import DocsManager from "./services/DocsManager/service.js";
import ServerManager from "./services/ServerManager/service.js";
import AuthManager from "./services/AuthManager/service.js";
import ApiManager from "./services/ApiManager/service.js";
import HealthManager from "./services/HealthManager/service.js";
import ImportManager from "./services/ImportManager/service.js";
import Validator from "./services/Validator/service.js";
import getVersion from 'git-repo-version';
import TelegramBot from 'node-telegram-bot-api';

export default Horizen;
export {HealthManager};

function Horizen(config){	
	const self = this;
	const mongoManager = new MongoManager({config});
	
	this.init = init;

	async function init(callback){
		try{ 
			const db = await mongoManager.init(config.mongodb && config.mongodb.index ? {toIndex: config.mongodb.index} : {});
			const healthManager = new HealthManager({config, TelegramBot});
			const serverManager = new ServerManager({config, Validator});
			const apiManager = new ApiManager({config, serverManager, Validator});
			const authManager = new AuthManager({config, apiManager});
			const importManager = new ImportManager({config});
			const docsManager = new DocsManager({config, serverManager, apiManager});
			const horizenVersion = await importHorizenVersion();

			serverManager.setAuthProvider(authManager.authStrategies);

			const serverOptions = {
				setCustomTypes: serverManager.setCustomTypes,
				setCustomAuthProvider: serverManager.setAuthProvider,
				addRemoteAPI: apiManager.set 
			}

			const serverParams = await callback({
				mongoManager: mongoManager,
				health: healthManager,

				localServices: await importManager.loadLocalServices(),
				controllers: await importManager.loadLocalControllers(),
				
				api: apiManager.execs,
				gfs: db.gfs,
				db: (collection)=> db.collection(collection),
				ObjectId: (str)=> mongoManager.ObjectId(str),
			}, serverOptions);

			if(serverParams && serverParams.controllers){
				serverParams.controllers.post = serverParams.controllers.post || [];
				serverParams.controllers.post.push(new authManager.controllers.ExchangeCode({config, db}));
				serverParams.controllers.post.push(new authManager.controllers.ExchangeToken({config, db}));

				docsManager.initDocsPusher({
					horizenVersion: horizenVersion,
					name: config.name || "unnamed",
					version: getVersion(),
					methods: serverParams.controllers
				});
				
				serverManager.startServer(serverParams.controllers, {
					port: serverParams.port
				});			
			}
		} catch(e){
			console.log(e);
			process.exit(1);
		}


		async function importHorizenVersion(){
			try{
				return (await import(`../package.json`, {assert: { type: 'json' }})).default.version;
			} catch(e){
				return "unknown";
			}
		}
	}
}