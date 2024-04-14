#!/usr/bin/env node

import yargs from 'yargs';
import prompt from 'prompt';
import colors from "@colors/colors/safe.js";
import {exec} from 'child_process';
import fs from "fs-extra";
import cliSpinners from 'cli-spinners';
import ora from 'ora';

const log = console.log;
const remoteSchemaSource = yargs(process.argv).argv.s;


console.log(colors.yellow("==================================="))
console.log(colors.yellow("======= NEW HORIZEN MODULE ========"))
console.log(colors.yellow("==================================="))

if(remoteSchemaSource){
	createFromSchema();
} else {
	createFromScratch();
}

async function createFromSchema(){
	const schema = await downloadSchema();
	const spinner = await create(null, {
		moduleType: schema.moduleType,
		folderName: schema.folderName
	});

	spinner.start("Чистим дефолтные шаблоны");
	fs.removeSync(`./${schema.folderName}/processes`);
	fs.removeSync(`./${schema.folderName}/services`);
	fs.removeSync(`./${schema.folderName}/controllers`);
	spinner.succeed("Чистим дефолтные шаблоны");
	
	spinner.start("Генерируем сущности по схеме");
	for(let file of schema.files){
		fs.outputFileSync(`${schema.folderName}${file.path}`, file.content);
	}
	spinner.succeed("Генерируем сущности по схеме");
	
	done(schema.folderName);

	async function downloadSchema(){
		return (await (await fetch(remoteSchemaSource)).json()).result;
	}
}

function createFromScratch(){
	const schema = {
		properties: {
			moduleType: {
				description: colors.magenta('Укажите тип модуля [b]ack/[f]ront'),
				pattern: /^(f|b)|(F|B)$/,
				message: colors.red('Нужен один символ f или b!'),
				required: true,
				before: (value)=> value.toLowerCase()
			},

			folderName: {
				description: colors.magenta('Придумайте название для папки'),
				pattern: /^[a-z0-9A-Z-_]+$/,
				message: colors.red('Не матчится с регуляркой [a-z0-9A-Z-_]!'),
				required: true
			}
		}
	};

	prompt.start();

	prompt.get(schema, async function(err, result){
		console.log(err);
		await create(err, result);
		done(result.folderName);
	});
}

function done(folderName){
	console.log(colors.green(`Готово! Развернули модуль в "./${folderName}".`));

	process.exit(0);
}

async function create(err, result){
	console.log(colors.gray("==================================="));
	const spinner = ora({spinner: cliSpinners.shark, color: "yellow"}).start();
	const isDebug = yargs(process.argv).argv.debug;

	checkFolder();
	spinner.succeed("Проверяем отсутствие папки");
	
	spinner.start("Клонируем шаблон");
	await cloneRepo();
	spinner.succeed("Клонируем шаблон");

	replaceConfig();
	spinner.succeed("Прокидываем порт и название в конфиг");
	spinner.succeed("Инициализируем чистый репозиторий");

	spinner.start("Собираем окружение");
	await initGitRepo();
	spinner.succeed("Собираем окружение");

	return spinner;

	function wait(s){
		return new Promise(function(resolve){
			setTimeout(resolve, s * 1000);
		})
	}

	function initGitRepo(){
		return new Promise(async function(resolve){
			const proc = exec(`cd ${result.folderName} && git init && git checkout -b master && git branch -M master && horizen-reinstall && git add -A && git commit -m "First commit"`);

			if(isDebug){
				proc.stdout.on('data', (data) => {
				    console.log(`${data}`);
				});

				proc.stderr.on('data', (data) => {
				    console.error(`${data}`);
				});
			}

			proc.on('close', (code) => {
			   	code === 0 ? resolve() : (console.log("\nОшибка инициализации репозитория", code), process.exit(1));
			});
		});
	}

	function replaceConfig(){
		const path = `./${result.folderName}/config.json`;
		const config = JSON.parse(fs.readFileSync(path));

		if(config.horizen){
			config.horizen.name = result.folderName;
		}

		fs.writeFileSync(path, JSON.stringify(config, null, 4));
	}

	function checkFolder(){
		if(fs.existsSync(result.folderName)) {
			spinner.fail(colors.red(`Папка "${result.folderName}" уже существует.`))
			process.exit(1);
		}
	}

	function cloneRepo(){
		return new Promise(function(resolve){
			const proc = exec(`cp -rf $(npm list -g horizen-framework | grep "/")/node_modules/horizen-framework/templates/${result.moduleType === "b" ? "demo_back" : "demo_front"} ${result.folderName} && cd ${result.folderName} && mv ./_gitignore ./.gitignore`);

			if(isDebug){
				proc.stdout.on('data', (data) => {
				   console.log(`${data}`);
				});

				proc.stderr.on('data', (data) => {
				    console.error(`${data}`);
				});
			}

			proc.on('close', (code) => {
			   	code === 0 ? resolve() : (spinner.fail("Ошибка клонирования", code), process.exit(1));
			});
		});
	}
}

