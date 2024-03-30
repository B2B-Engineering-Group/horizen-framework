import MongoManager from "./services/MongoManager/service.js";
import DocsManager from "./services/DocsManager/service.js";
import ServerManager from "./services/ServerManager/service.js";
import AuthManager from "./services/AuthManager/service.js";
import ApiManager from "./services/ApiManager/service.js";
import HealthManager from "./services/HealthManager/service.js";
import DaemonManager from "./services/DaemonManager/service.js";
import ImportManager from "./services/ImportManager/service.js";
import Validator from "./services/Validator/service.js";

export default Horizen;

function Horizen(config){	
	const self = this;
	const mongoManager = new MongoManager({config});
	
	this.init = init;

	async function init(callback){
		try{ 
			const db = await mongoManager.init();
			const healthManager = new HealthManager({config});
			const daemonManager = new DaemonManager({config, healthManager});
			const serverManager = new ServerManager({config, Validator, healthManager});
			const apiManager = new ApiManager({config, serverManager, Validator, healthManager});
			const authManager = new AuthManager({config, apiManager});
			const importManager = new ImportManager({config});
			const docsManager = new DocsManager({config, serverManager, apiManager, daemonManager});
			
			serverManager.setAuthProvider(authManager.authStrategies);

			const options = {
				setCustomTypes: serverManager.setCustomTypes,
				setCustomAuthProvider: serverManager.setAuthProvider,
				setMongoIndex: mongoManager.setIndex,
			};

			const props = {
				localServices: await importManager.loadLocalServices(),
				controllers: await importManager.loadLocalControllers(),
				setDaemon: daemonManager.setDaemon,
				api: apiManager,
				gfs: mongoManager.gfs,
				mongoManager: mongoManager,
				dbTransaction: mongoManager.dbTransaction,
				db: (collection)=> db.collection(collection)
			};

			const serverParams = ensureServerParams(await callback(props, options));

			createHiddenApiLayer();
			
			serverManager.startServer(serverParams.controllers, {
				port: serverParams.port
			});

			await apiManager.lock();
			await daemonManager.lock();

			await docsManager.configure({
				name: config.name || "unnamed",
				methods: serverParams.controllers
			});

			await docsManager.exportModuleSchema();
		

			function createHiddenApiLayer(){
				serverParams.controllers.post.push(new healthManager.GetHealthInfo({}));
				serverParams.controllers.post.push(new authManager.controllers.ExchangeCode({config, db}));
				serverParams.controllers.post.push(new authManager.controllers.ExchangeToken({config, db}));
				serverParams.controllers.post.push(new docsManager.GetModuleSchema({}));
			}

			function ensureServerParams(serverParams){
				serverParams = serverParams  || {};
				serverParams.controllers = serverParams.controllers || {};
				serverParams.controllers.post = serverParams.controllers.post || [];
				serverParams.controllers.get = serverParams.controllers.get || [];
				serverParams.port = serverParams.port || "80";

				return serverParams;
			}
		} catch(e){
			console.log(e);
			process.exit(1);
		}
	}
}


