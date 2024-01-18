#!/usr/bin/env node

import yargs from 'yargs';
import prompt from 'prompt';
import colors from "@colors/colors/safe.js";
import {exec} from 'child_process';
import fs from "fs-extra";
import cliSpinners from 'cli-spinners';
import ora from 'ora';

const log = console.log;

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
console.log(colors.yellow("==================================="))
console.log(colors.yellow("======= NEW HORIZEN MODULE ========"))
console.log(colors.yellow("==================================="))

prompt.start();

prompt.get(schema, async function(err, result) {
	console.log(colors.gray("==================================="))
	const spinner = ora({spinner: cliSpinners.shark, color: "yellow"}).start();
	const isDebug = yargs(process.argv).argv.debug;

	checkFolder();
	spinner.succeed("Проверяем отсутствие папки");
	
	spinner.start("Клонируем репозиторий");
	await cloneRepo();
	spinner.succeed("Клонируем репозиторий");

	replaceConfig();
	spinner.succeed("Прокидываем порт и название в конфиг");
	//replaceGitIgnore();
	//spinner.succeed("Добавляем config.json в .gitignore");
	spinner.succeed("Инициализируем чистый репозиторий");

	spinner.start("Собираем окружение");
	await initGitRepo();
	spinner.succeed("Собираем окружение");

	console.log(colors.green(`Готово! Развернули модуль в "./${result.folderName}".`));
	//console.log(colors.green(`Запустите horizen-reinstall внутри "./${result.folderName}" чтобы доустановить пакеты.`));

	process.exit(0);

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
			   	code === 0 ? resolve() : (console.log("Ошибка инициализации репозитория", code), process.exit(1));
			});
		});
	}

	function replaceGitIgnore(){
		//const path = `./${result.folderName}/_gitignore`;
		//let gitignore = fs.readFileSync(path).toString();
		
		//gitignore = gitignore + (`
		//	config.json
		//`);

		//fs.writeFileSync(path, gitignore);
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
});
