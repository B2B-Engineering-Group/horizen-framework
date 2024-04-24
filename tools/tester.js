#!/usr/bin/env mocha --no-warnings --timeout 20000000 --exit

import fs from "fs-extra";
import ImportManager from "../backend/services/ImportManager/service.js";
import Horizen from "../backend/index.js";
import colors from "@colors/colors/safe.js";
import path from "path";
import yargs from 'yargs';
import isPortFree from 'is-port-free';
import cliSpinners from 'cli-spinners';
import filterConsole from 'filter-console';
import ora from 'ora';

const config = JSON.parse(fs.readFileSync(path.resolve(".") + "/config.json"));
const importManager = new ImportManager({config});
const log = beautifyLogs();


before(function(done){
	log(colors.yellow("======= ЗАПУСК ТЕСТОВ ========"))

	if(config.horizen){
		(new Backend(done)).run();
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
});

it('', (done)=> { done(); });

function beautifyLogs(){
	const log = console.log;
	const verbose = yargs(process.argv).argv.verbose;

	if(!verbose){
		console.log = ()=> null;
	} else {
		filterConsole([
			'App started at',
			'Connectig to MongoDB',
			'Connected to MongoDB'
		]);	
	}

	return log;
}

function Backend(done){
	const self = this;
	const spinner = ora({spinner: cliSpinners.shark, color: "yellow"});

	self.run = run;

	async function run(){
		config.horizen.ports["$$horizen"] = "8089";

		await validatePorts(spinner);
		const imports = await importScripts(spinner);
		const deps = {...imports.localServices, ...imports.common, config, log};

		await declareProcessTests(imports, deps);
		await declareUnitTests(imports, deps);
		
		done();
	}

	async function declareUnitTests(imports, deps){
		const horizen = new Horizen(config.horizen);

		return new Promise(function(resolve){
			horizen.init(async function(common){
				for(let name of Object.keys(imports.serviceTests)){
					const serviceTest = imports.serviceTests[name];
		
					describe(`UNIT СЕРВИСА [${name}]`, function(){
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

				resolve();
			});
		});
	}

	async function declareProcessTests(imports, deps){
		for(let name of Object.keys(imports.processesTests)){
			const proccessTest = imports.processesTests[name];
			
			describe(`E2E ПРОЦЕССА [${name}]`, async function(){
				if(typeof proccessTest !== "function"){
					it(`[${name}] некорректно экспортирован или отсутствуют тесты`, (done)=> { done(`[${name}] Отсутствуют тесты`); });
				} else{
					try{
						proccessTest({...deps, url: `http://127.0.0.1:${config.horizen.ports[name]}`})
					} catch(e){
						console.log(e);
					}
				}
			});
		}
	}

	async function importScripts(){
		spinner.start("Импортируем и запускаем процессы");
		const serviceTests = await importManager.loadLocalServicesTests();
		const localServices = await importManager.loadLocalServices();
		const processesTests = await importManager.loadLocalProcessesTests();
		const processes = await importManager.loadLocalProcesses();

		for(let key in processes){
			await enableTestMode(processes[key]);
		}

		spinner.succeed("Импортируем и запускаем процессы");

		return {serviceTests, localServices, processesTests, processes};

		async function enableTestMode(proc){
			return new Promise(function(resolve){
				proc.then((horizen)=> {
					horizen.enableTestMode();
					resolve();
				});
			})
		}
	}

	async function validatePorts(spinner){
		const ports = config.horizen.ports;

		await isPortsFree(spinner, ports);
		await isNoPortCollisions(spinner, ports);
		await isAllProcessesDeclared(spinner, ports);

		async function isAllProcessesDeclared(spinner, ports){
			const list = fs.readdirSync("./processes");

			spinner.start("Проверяем config.horizen.ports");

			for(let name of list){
				if(!fs.lstatSync(`./processes/${name}`).isFile()){
					if(!config.horizen.ports[name]){
						spinner.fail("Проверяем config.horizen.ports");
						log(colors.red(`В config.horizen.ports не проброшен процесс ${name}`));
						log(colors.red(`У каждого процесса должен быть свой уникальный порт, даже если это демон.`));
						process.exit(-1);
					}
				}
			}

			spinner.succeed("Проверяем config.horizen.ports");
		}

		async function isNoPortCollisions(spinner, ports){
			spinner.start("Проверяем отсутствие коллизий");

			const map = {};

			for(let port of Object.values(ports)){
				if(!map[port]){
					map[port] = true;
				} else {
					spinner.fail("Проверяем отсутствие коллизий");
					log(colors.red(`В config.horizen.ports обнаружены одинаковые порты, запуск тестов невозможен.`))
					log(colors.red(`У каждого процесса должен быть свой уникальный порт, даже если это демон.`))
					logServicePortNote();
					process.exit(-1);
				}
			}

			spinner.succeed("Проверяем отсутствие коллизий");
		}

		async function isPortsFree(spinner, ports){
			spinner.start("Проверяем доступность портов");

			try{
				for(let port of Object.values(ports)){
					try{
						await isPortFree(port)
					} catch(e){
						throw port;
					}
				}

				spinner.succeed("Проверяем доступность портов");
			} catch(e){
				spinner.fail("Проверяем доступность портов");
				log(colors.red(`На порту ${e} уже кто-то висит, запуск тестов невозможен.`));
				logServicePortNote();
				process.exit(-1);
			}
		}
	}
}

function logServicePortNote(){
	log(colors.red(`Также обратите внимание, что ${config.horizen.ports["$$horizen"]} нельзя занимать, это сервисный порт.`));
}

async function loadServiceTesters(){
	return await importManager.dirImporter(`${path.resolve('.')}/services/`, true);
}