#!/usr/bin/env mocha
import fs from "fs-extra";
import ImportManager from "../backend/services/ImportManager/service.js";
import Horizen from "../backend/index.js";
import path from "path";

const config = JSON.parse(fs.readFileSync(path.resolve(".") + "/config.json"));
const importManager = new ImportManager({config});

console.log(process.argv.pop());

before(function(done){
	if(config.horizen){
		testBack();
	} else{
		testFront();
	}

	async function testFront(){
		const serviceTests = await loadServiceTesters();

		for(let name of Object.keys(serviceTests)){
			const serviceTest = serviceTests[name];

			describe(`ПРОВЕРКА СЕРВИСА [${name}]`, async function(){
				if(typeof serviceTest !== "function"){
					it(`[${name}] некорректно экспортирован или отсутствуют тесты`, (done)=> { done(`[${name}] некорректно экспортирован или отсутствуют тесты`); });
				} else{
					serviceTest()
				}
			});
		}

		done();
	}

	function testBack(){
		const horizen = new Horizen(config.horizen);

		horizen.init(async function(common){
			try{

				const localServices = await importManager.loadLocalServices();
				const serviceTests = await importManager.loadLocalServicesTests();
				const deps = {...localServices, ...common, config};
				
				for(let name of Object.keys(serviceTests)){
					const serviceTest = serviceTests[name];
					
					describe(`UNIT СЕРВИСА [${name}]`, async function(){
						if(typeof serviceTest !== "function"){
							it(`[${name}] некорректно экспортирован или отсутствуют тесты`, (done)=> { done(`[${name}] Отсутствуют тесты`); });
						} else{
							try{
								serviceTest(deps)
							} catch(e){
								console.log(e);
							}
						}
					});
				}

				//const processes = await importManager.loadLocalProcesses();
				const processesTests = await importManager.loadLocalProcessesTests();

				for(let name of Object.keys(processesTests)){
					const proccessTest = processesTests[name];
					
					describe(`E2E ПРОЦЕССА [${name}]`, async function(){
						if(typeof proccessTest !== "function"){
							it(`[${name}] некорректно экспортирован или отсутствуют тесты`, (done)=> { done(`[${name}] Отсутствуют тесты`); });
						} else{
							try{
								proccessTest(deps)
							} catch(e){
								console.log(e);
							}
						}
					});
				}

				done();
			} catch(e){
				console.log(e);
			}
		});
	}
});

it('...', (done)=> { done(); });

async function loadServiceTesters(){
	return await importManager.dirImporter(`${path.resolve('.')}/services/`, true);
}

