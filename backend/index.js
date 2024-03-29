import MongoManager from "./services/MongoManager/service.js";
import DocsManager from "./services/DocsManager/service.js";
import ServerManager from "./services/ServerManager/service.js";
import AuthManager from "./services/AuthManager/service.js";
import ApiManager from "./services/ApiManager/service.js";
import HealthManager from "./services/HealthManager/service.js";
import ImportManager from "./services/ImportManager/service.js";
import Validator from "./services/Validator/service.js";
import TelegramBot from 'node-telegram-bot-api';

export default Horizen;
export {HealthManager};

function Horizen(config){	
	const self = this;
	const mongoManager = new MongoManager({config});
	
	this.init = init;

	async function init(callback){
		try{ 
			const db = await mongoManager.init();
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
				setMongoIndex: mongoManager.setIndex,
			};

			const serverParams = ensureServerParams(await callback({
				mongoManager: mongoManager,
				health: healthManager,

				localServices: await importManager.loadLocalServices(),
				controllers: await importManager.loadLocalControllers(),
				
				api: apiManager,
				gfs: db.gfs,
				db: (collection)=> db.collection(collection)
			}, serverOptions));

			serverParams.controllers.post.push(new authManager.controllers.ExchangeCode({config, db}));
			serverParams.controllers.post.push(new authManager.controllers.ExchangeToken({config, db}));
			serverParams.controllers.post.push(new docsManager.GetModuleDocs({}));

			await docsManager.configure({
				name: config.name || "unnamed",
				methods: serverParams.controllers
			});

			await docsManager.exportModuleSchema();
			
			serverManager.startServer(serverParams.controllers, {
				port: serverParams.port
			});

			await apiManager.lock();
		} catch(e){
			console.log(e);
			process.exit(1);
		}

		function ensureServerParams(serverParams){
			serverParams = serverParams  || {};
			serverParams.controllers = serverParams.controllers || {};
			serverParams.controllers.post = serverParams.controllers.post || [];
			serverParams.controllers.get = serverParams.controllers.get || [];
			serverParams.port = serverParams.port || "80";

			return serverParams;
		}
	}
}


