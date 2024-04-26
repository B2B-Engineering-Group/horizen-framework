#!/usr/bin/env -S node --no-warnings

import fs from "fs-extra";
import yargs from 'yargs';
import {exec} from 'child_process';
import {isBinaryFile} from "isbinaryfile";
import colors from "@colors/colors/safe.js";
import cliSpinners from 'cli-spinners';
import ora from 'ora';

const spinner = ora({spinner: cliSpinners.shark, color: "yellow"});

console.log(colors.yellow("======= ОТПРАВКА НА РЕВЬЮ ========"));

await init();

async function init(){
	const result = {};

	spinner.start("Проводим локальное тестирование");
	result.tests = toBase64(await createTestReport());
	spinner.succeed("Проводим локальное тестирование");

	spinner.start("Импортируем ключевые файлы");
	result.files  = await getFilesFlat();
	spinner.succeed("Импортируем ключевые файлы");

	spinner.start("Сохраняем схему для ревью");
	fs.writeFileSync(".review.txt", toBase64(JSON.stringify(result)));
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

async function getFilesFlat(){
	const result = [];
	
	await importFiles();

	return result;

	async function importFiles(path = "."){
		const root = fs.readdirSync(path);
		const children = [];

		for(let key of root){
			const item = {};
			const subPath = `${path}/${key}`;
			
			children.push(result.push(item) - 1);

			if(!await isIgnored(key, subPath)){
				if(isFile(subPath)){
					Object.assign(item, {
						type: "file",
						name: key,
						path: subPath,
						content: toBase64(fs.readFileSync(subPath).toString())
					})
				} else {
					Object.assign(item, {
						type: "dir",
						name: key,
						path: subPath,
						children: await importFiles(subPath)
					});
				}
			} else {
				Object.assign(item, {
					type: "ignored",
					name: key,
					path: subPath,
				});
			}
		}

		if(path === "."){
			result.push({
				type: "root",
				name: ".",
				path: ".",
				children: children
			});
		}
		
		return children;

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
}



function toBase64(str){
	return (Buffer.from(str)).toString('base64');
}