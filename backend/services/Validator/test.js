import express from "express";
import {expect} from "chai";
import { Blob } from "buffer";

export default Test;

function Test({db, Validator, mongoManager}) {
	it(`Валидация String`, async ()=> { 
		const validator = new Validator();
		const {string} = validator.getTypes();

		const correct = await validator.isValid({
			testString: string(/[a-zA-Z]{3,10}/)
		}, {
			testString: "ABCD"
		});

		expect(!!correct.success).to.be.equal(true);

		const incorrect = await validator.isValid({
			testString: string(/[a-zA-Z]{3,10}/)
		}, {
			testString: "12345"
		});

		expect(!!incorrect.success).to.be.equal(false);
	});

	it(`Валидация Boolean`, async ()=> { 
		const validator = new Validator();
		const {boolean} = validator.getTypes();

		const correct = await validator.isValid({
			testBoolean: boolean(),
			testBoolean2: boolean(),
		}, {
			testBoolean: true,
			testBoolean2: false,
		});

		expect(!!correct.success).to.be.equal(true);

		const incorrect = validator.isValid({
			testBoolean: boolean(),
			testBoolean2: boolean(),
		}, {
			testBoolean: "true",
			testBoolean2: "false",
		});

		expect(!!incorrect.success).to.be.equal(false);
	});

	it(`Валидация Number`, async ()=> { 
		const validator = new Validator();
		const {number} = validator.getTypes();

		const correct = await validator.isValid({
			testNumber: number(/[0-9]{3,10}/)
		}, {
			testNumber: 1234
		});

		expect(!!correct.success).to.be.equal(true);

		const incorrect = await validator.isValid({
			testNumber: number(/[0-9]{3,10}/)
		}, {
			testNumber: "1234"
		});

		expect(!!incorrect.success).to.be.equal(false);
	});

	it(`Валидация Object`, async ()=> { 
		const validator = new Validator();
		const {object, boolean} = validator.getTypes();

		const correct = await validator.isValid({
			test: boolean()
		}, {
			test: true
		});

		expect(!!correct.success).to.be.equal(true);

		var incorrect = await validator.isValid({
			test: boolean()
		}, {
			test: null
		});

		expect(!!incorrect.success).to.be.equal(false);

		var incorrect = await validator.isValid({
			test: boolean(),
			abcd: boolean(),
		}, {
			test: null
		});

		expect(!!incorrect.success).to.be.equal(false);
		expect(!!incorrect.text.match("inssuficientFields::abcd")).to.be.equal(true);

		var incorrect = await validator.isValid({
			test: boolean()
		}, {
			abcd: true,
			test: null
		});

		expect(!!incorrect.success).to.be.equal(false);
		expect(!!incorrect.text.match("notDeclaredField")).to.be.equal(true);
	});

	it(`Валидация Array`, async ()=> { 
		const validator = new Validator();
		const {array, string} = validator.getTypes();

		const correct = await validator.isValid({
			test: array(string(/abcd/))
		}, {
			test: ["abcd"]
		});

		expect(!!correct.success).to.be.equal(true);

		var incorrect = await validator.isValid({
			test: array(string(/abcd/))
		}, {
			test: ["1234"]
		});

		expect(!!incorrect.success).to.be.equal(false);
		expect(incorrect.text).to.be.equal("root.test[0]::invalidString");
	});

	it(`Валидация File [Blob]`, async ()=> { 
		const validator = new Validator();
		const {file} = validator.getTypes();

		var correct = await validator.isValid(file({
			maxSizeMb: 1, 
			mimetypes: ["*"]
		}), {blob: new Blob(["test"], {type: "text"}), filename: ""});

		expect(!!correct.success).to.be.equal(true);

		var correct = await validator.isValid(file({
			maxSizeMb: 1, 
			mimetypes: ["text"]
		}), {blob: new Blob(["test"], {type: "text"}), filename: ""});
		
		expect(!!correct.success).to.be.equal(true);

		var incorrect = await validator.isValid(file({
			maxSizeMb: 0, 
			mimetypes: ["text"]
		}), {blob: new Blob(["test"], {type: "text"}), filename: ""});
		
		expect(!!incorrect.text.match("root::invalidSize")).to.be.equal(true);

		var incorrect = await validator.isValid(file({
			maxSizeMb: 1, 
			mimetypes: ["mime"]
		}), {blob: new Blob(["test"], {type: "text"}), filename: ""});
		
		expect(!!incorrect.text.match("root::invalidMime")).to.be.equal(true);

		var incorrect = await validator.isValid(file({
			maxSizeMb: 1, 
			mimetypes: ["mime"]
		}), {});
		
		expect(!!incorrect.text.match("root::BlobAndFilenameInObjectRequired")).to.be.equal(true);
	});

	it(`Валидация File [multipart/form-data > Blob]`, (done)=> { 
		const port = 3333;
		const url = `http://127.0.0.1:${port}/upload`;
		const app = express();
		const server = app.listen(port, async function(){
			app.post('/upload', async (req, res) => {
				const validator = new Validator({req, res});
				const {file} = validator.getTypes();
				
				const correct = await validator.isValid(file({
					maxSizeMb: 1, 
					mimetypes: ["*"]
				}), null);
				
				expect(!!correct.success).to.be.equal(true);
				expect(correct.result.blob.type).to.be.equal("text");
				expect(await correct.result.blob.text()).to.be.equal("test1");

				done();
		
				server.close();
			});

			sendFile();

			function sendFile(){
				return new Promise(async function(){
					await (await fetch(url, getFetchOptions())).json();
				})
			}
		});
	
		function getFetchOptions(){
			const blob = new Blob(["test1"], {type: "text"});
		    const form = new FormData();

		    form.append('file', blob, "filename");
		    
		    return {
		        method: 'POST',
		        body: form
		    };
		}
	});
}

//Протестировать монгу чтобы правильно работала с файлами
//Протестировать API запросы чтобы правильно работали с файлами
//Дописать документацию чтобы туда прокидывалась информация
//Добавить версию хорайзена в документацию помимо комита
//Попробовать валидировать исходные модели валидатора валидатором.
//Попробовать валидировать контроллеры валидатором
//заменить describe/validator на resSchema/reqSchema
//заменить platform на microservices
//Починить демо-проекты и убрать лишние тесты
//Валидатор должен иметь пометку скоупа



//Написать человеку вводное сообщение



