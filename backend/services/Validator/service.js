import multer from 'multer';
import { Blob } from "buffer";

export default Validator;

function Validator(params = {}){
	var path = [];
	const self = this;
	const {req, res, ignoreNotDeclaredFields} = params;
	const types = {string, number, boolean, array, object, any, file};

	self.getTypes = getTypes;
	self.isValid = isValid;

	function getTypes(){
		const result = {};

		Object.keys(types).forEach((key)=> {
			result[key] = types[key]().build;
		});

		return result
	}

	async function isValid(model, body){
		try{
			if(model.type === "file"){
				return {
					success: true, 
					result: await types.file().validate(model, body)
				}
			} 

			else {
				types.object(true).validate({
					type: "object",
					schema: model,
					optional: false
				}, body);

				return {
					success: true, 
					result: body
				}
			}
		} catch(e){
			if(!e.code){
				console.log("Invalid validator model detected", e);
				process.exit(-1);
			}

			return {
				errored: true,
				code: "invalidParams",
				text: `${path.join(".").replace(/\.([0-9]+)/gim, "[$1]") || "root"}::${e.code}`
			};
		}
	}

	function object(isRoot) {
		return {build, validate};

		function validate(model, value){
			if(model.type !== "object" || !isObject(value)){
				throw {code: "invalidObject"};
			}

			for(let key of Object.keys(model.schema)){
				if(!value.hasOwnProperty(key) && !model.schema[key].isOptional){
					throw {code: `inssuficientFields::${key}`};
				}
			}

			for(let key of Object.keys(value)){
				if(isRoot){
					path = ["root", key];
				} else {
					path.push(key);
				}

				if(!model.schema[key]){
					if(!ignoreNotDeclaredFields){
						throw {code: "notDeclaredField"};
					} else {
						delete value[key];
					}
				}

				else if(!types[model.schema[key].type]().validate(model.schema[key], value[key])){
					throw {code: "valueIsNotValid"};
				}

				path.pop();
			}

			return true;
		}

		function build(objSchema){
			if(!objSchema || !isObject(objSchema)){
				throw new Error("InvalidObjectSchema, native object required as first argument.")
			}

			return Object.assign(Object.create({optional, required}), {
				type: "object",
				schema: objSchema,
				isOptional: false
			})
		}
	}

	function array(){
		return {build, validate};

		function validate(model, value){
			if(model.type !== "array" || !isArray(value)){
				throw {code: "invalidArray"};
			}

			if(value.length > model.maxLength){
				throw {code: "invalidArrayMaxLength"};
			}

			if(value.length < model.minLength){
				throw {code: "invalidArrayMinLength"};
			}

			const arr = [].concat(value);

			for(let item of arr){
				path.push(`${arr.indexOf(item)}`);

				if(!types[model.schema.type]().validate(model.schema, item)){
					throw {code: "arrayValueIsNotValid"};
				}

				path.pop();
			}

			return true;
		}

		function build(typeResult){
			if(!typeResult || !types[typeResult.type]){
				throw new Error("Invalid validator type:array params. Validator type is required as first argument.")
			}

			return Object.assign(Object.create({length, optional, required}), {
				type: "array",
				schema: typeResult,
				isOptional: false,
				minLength: 0,
				maxLength: Infinity
			})
		}

		function isArray(item){
			return item instanceof Array;
		}
	}


	function file(){
		return {build, validate};

		async function validate(model, value){
			if(req && res){
				try{
					await uploadFile();
					
					return {
						blob: new Blob([req.file.buffer], {type: req.file.mimetype}),
						filename: req.file.originalname
					}
				} catch(e){
					throw {code: e.message.replace(/ +/gim, "_")};
				}
			} else {
				const checkSize = ()=> (model.maxSizeMb > value.blob.size / 1024 / 1024);
				const checkMime = ()=> (model.mimetypes.includes("*") || model.mimetypes.includes(value.blob.type.split(";")[0]));
			
				if(!isObject(value)){
					throw {code: "BlobAndFilenameInObjectRequired"}
				}

				if(!isString(value.filename)){
					throw {code: "BlobAndFilenameInObjectRequired"}
				}

				if(isBlob(value.blob)){
					if(checkSize()){
						if(checkMime()){
							return value;
						} else {
							throw {code: "invalidMime"}
						}
					} else {
						throw {code: "invalidSize"}
					}
				} else {
					throw {code: "isNotABlob"}
				}
			}

			function uploadFile(){
				return new Promise((resolve, reject) => {
		            const storage = multer.memoryStorage()
		            const upload = multer({ 
		                storage, fileFilter,

		                limits: {
		                    fields: 0,
		                    files: 1,
		                    fieldSize: 0,
		                    fileSize: 1e+6 * model.maxSizeMb,
		                }
		            }).single('file');

		            upload(req, res, async function(err){
		                if(err){
		                    reject(err)
		                    return null;
		                }

		                resolve(req.file);
		            });

		            function fileFilter(req, file, cb){
		                if(model.mimetypes.includes(file.mimetype.split(";")[0]) || model.mimetypes.includes("*")){
		                    cb(null, true);
		                    return null;
		                }

		                cb({message: "Invalid file type"}, false);
		            }
		        });
			}

			function isBlob(value){
				return value instanceof Blob || toString.call(value) === '[object Blob]';
			}
		}

		function build(params){
			params = params || {};

			const {maxSizeMb = Infinity, mimetypes = ["*"]} = params;
			
			return Object.assign(Object.create({}), {
				type: "file",
				maxSizeMb: maxSizeMb,
				mimetypes: mimetypes
			});
		}
	}

	

	function any(){
		return {build, validate};

		function validate(model, value){
			return true;
		}

		function build(){
			return Object.assign(Object.create({optional, required}), {
				type: "any",
				isOptional: false
			});
		}
	}

	function string(){
		return {build, validate};

		function validate(model, value){
			if(model.type !== "string" || !isString(value) || !value.match(new RegExp(model.schema, "igm"))){
				throw {code: "invalidString"};
			}

			return true;
		}

		function build(regExp){
			const regExpStr = shieldRegExp("" + regExp);

			return Object.assign(Object.create({optional, required}), {
				type: "string",
				schema: regExpStr,
				isOptional: false
			})

			function shieldRegExp(regExpStr){
				return regExpStr.replace(/^\//, "^(").replace(/\/$/, ")$");
			}
		}
	}

	function number(regExp){
		return {build, validate};

		function validate(model, value){
			if(model.type !== "number" || !isNumber(value) || !("" + value).match(new RegExp(model.schema))){
				throw {code: "invalidNumber"};
			}

			return true;
		}

		function build(regExp){
			return Object.assign(Object.create({optional, required}), {
				type: "number",
				schema: string().build(regExp).schema,
				isOptional: false
			});
		}

		function isNumber(item){
			return typeof item === "number" && item === item;
		}
	}

	function boolean(){
		return {build, validate};

		function validate(model, value){
			if(model.type !== "boolean" || !isBoolean(value) || !("" + value).match(new RegExp(model.schema))){
				throw {code: "invalidBoolean"};
			}

			return true;
		}

		function build(arg){
			return Object.assign(Object.create({optional, required}), {
				type: "boolean",
				schema: string().build(/(true)|(false)/).schema,
				isOptional: false
			});
		}

		function isBoolean(item){
			return typeof item === "boolean";
		}
	}

	function ensurePath(callback){
		return function(name){
			path.push(name);

			return callback;
		}
	}

	function isObject(item){
		return item && typeof item === "object" && !(item instanceof Array);
	}

	function isString(item){
		return typeof item === "string";
	}

	function required(){
		this.isOptional = false;
		
		return this;;
	}

	function optional(){
		this.isOptional = true;
		
		return this;;
	}

	function length(min, max){
		if(min >= 0){
			this.minLength = parseInt(min);
		} 

		if(max >= 0){
			this.maxLength = parseInt(max);
		}
		
		return this;
	}
}	