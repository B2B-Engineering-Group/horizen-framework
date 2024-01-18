import fs from 'fs-extra';
import path from "path";

export default ImportManager;

function ImportManager(config){	
	const self = this;

	self.loadLocalControllers = loadLocalControllers;
	self.loadLocalServicesTests = loadLocalServicesTests;
	self.loadLocalServices = loadLocalServices;
	self.loadLocalProcessesTests = loadLocalProcessesTests;
	self.loadLocalProcesses = loadLocalProcesses;
	self.dirImporter = dirImporter;

	async function loadLocalControllers(){
		return await dirImporter(`${path.resolve('.')}/controllers/`);
	}

	async function loadLocalServicesTests(){
		return await dirImporter(`${path.resolve('.')}/services/`, true);
	}

	async function loadLocalServices(){
		return await dirImporter(`${path.resolve('.')}/services/`);
	}

	async function loadLocalProcessesTests(){
		return await dirImporter(`${path.resolve('.')}/processes/`, true);
	}

	async function loadLocalProcesses(){
		return await dirImporter(`${path.resolve('.')}/processes/`);
	}

	async function dirImporter(dirPath, test = false){
		return await getFiles(dirPath);
		
		async function getFiles(dirPath){
			let files = {};

			try{
				let dir = fs.readdirSync(dirPath);

				for(let fileName of dir){
					if(!fileName.match(/^\./)){
						if(fileName.match(/\.js$/)){
							files[fileName.replace(".js", "")] = (await import(`${dirPath}/${fileName}`)).default;
						} 
	
						else if(test){
							try{
								files[fileName] = (await import(`${dirPath}${fileName}/test.js`)).default;
							} catch(e){
								if(e.code !== "ENOENT"){
									console.log(e);
									throw e;
								}

								files[fileName] = null;
							}
						}
	
						else{
							if(dirPath.match("services")){
								files[fileName] = (await import(`${dirPath}/${fileName}/service.js`)).default;
							} else {
								files[fileName] = (await import(`${dirPath}/${fileName}/process.js`)).default;
							}
						}
					} 
				}
			}catch(error){
				if(error.code !== "ENOENT"){
					console.log(error);
					throw error;
				}
			}

			return files;
		}
	}
}