#!/usr/bin/env node --no-warnings

import fs from "fs-extra";
import yargs from 'yargs';
import {exec} from 'child_process';
import {isBinaryFile} from "isbinaryfile";
import colors from "@colors/colors/safe.js";
import cliSpinners from 'cli-spinners';
import ora from 'ora';
import btoa from 'btoa';

const spinner = ora({spinner: cliSpinners.shark, color: "yellow"});

console.log(colors.yellow("======= ОТПРАВКА НА РЕВЬЮ ========"));

await init();

async function init(){
	const result = {};

	spinner.start("Проводим локальное тестирование");
	result.tests = await createTestReport();
	spinner.succeed("Проводим локальное тестирование");

	spinner.start("Импортируем ключевые файлы");
	result.files  = await importFiles(".");
	spinner.succeed("Импортируем ключевые файлы");

	spinner.start("Сохраняем схему для ревью");
	fs.writeFileSync(".review.txt", btoa(JSON.stringify(result)));
	spinner.succeed("Сохраняем схему для ревью");

	console.log(colors.green("Готово. Скопируйте содержимое файла и руками отправьте на ревью."));
	console.log(colors.yellow("Команда для копирования: pbcopy < .review.txt"));
}

async function createTestReport(){
	return new Promise(function(resolve, reject){
		exec("horizen-tester --reporter node_modules/mocha-simple-html-reporter --reporter-options output=.test_report.html", function(){
			const result = fs.readFileSync(".test_report.html").toString();

			fs.removeSync(".test_report.html");

			resolve(result)
		});
	});
}

async function importFiles(path, model = {}){
	const root = fs.readdirSync(path);

	Object.assign(model, {
		type: "dir",
		children: {}
	});

	for(let key of root){
		let subPath = `${path}/${key}`;

		if(!await isIgnored(key, subPath)){
			if(isFile(subPath)){
				model.children[key] = {
					name: key,
					type: "file",
					path: subPath,
					content: fs.readFileSync(subPath).toString()
				}
			} else {
				model.children[key] = {};
				importFiles(subPath, model.children[key])
			}
		} else {
			model.children[key] = {
				name: key,
				type: "ignored",
				path: subPath
			}
		}
	}

	return model;

	function isFile(subPath){
		return fs.lstatSync(subPath).isFile();
	}

	async function isIgnored(key, subPath){
		if(!!key.match("^\\.")){
			return true;
		}

		try{
			if(await isBinaryFile(subPath)){
				return true
			}
		} catch(e){}

		return [
			'node_modules',
		    'package-lock.json',
		].includes(key);
	}
}