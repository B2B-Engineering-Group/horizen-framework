#!/usr/bin/env node

import fs from "fs-extra";
import ImportManager from "../backend/services/ImportManager/service.js";
import Horizen from "../backend/index.js";
import path from "path";

//const config = JSON.parse(fs.readFileSync(path.resolve(".") + "/config.json"));

console.log('review');
//1. Запустить тесты по всему модулю с уникальным репортером
//Сохранить взять файлик с тестами а затем удалить его

//2. Забрать все директории



/**
 * 
 * import Horizen from "horizen-framework/backend";
import config from "../../config.json" assert {type: "json"};
import recursiveReaddirFiles from 'recursive-readdir-files';
import fs from "fs-extra";


const horizen = new Horizen(config.horizen);

export default horizen.init(async function(props, options){
	const {localServices, controllers} = props;

	
	console.log(JSON.stringify(importModule("../ozon_analytics_back"), null, 4));


	function importModule(path, model = {}){
		const root = fs.readdirSync(path);

		Object.assign(model, {
			type: "dir",
			children: {}
		});

		for(let key of root){
			let subPath = `${path}/${key}`;

			if(!isIgnored(key)){
				if(isFile(subPath)){
					model.children[key] = {
						type: "file",
						path: subPath,
						content: fs.readFileSync(subPath).toString()
					}
				} else {
					model.children[key] = {};
					importModule(subPath, model.children[key])
				}
			} else {

			}
		}

		return model;

		function isFile(subPath){
			return fs.lstatSync(subPath).isFile();
		}

		function isIgnored(key){
			return [
				'.git',
			    '.horizen-framework',
				'node_modules',
			    'package-lock.json',
			].includes(key);
		}
	}
});*/