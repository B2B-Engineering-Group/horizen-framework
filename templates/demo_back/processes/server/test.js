import {expect} from "chai";

//Процесс импортирован для упрощения восприятия. Он сразу запускает сервер.
//При работе не импортируйте процесс, а запускайте его в отдельном окне терминала.
import startedProcess from "./process.js"; 

export default Test;

function Test({config}){
	const url = `http://127.0.0.1:${config.horizen.ports.server}`
	describe("Получение приветствий", function(){
		it(`Должен вернуть Hello`, async ()=> { 
			const response = await (await fetch(`${url}/api/getHello`, {
			    method: "POST",
			    headers: { "Content-Type": "application/json"},
			    body: JSON.stringify({
			    	example: "example"
			    })
			})).json();

			//Важно проверять ключевые точки ответов во время тестирования 
			//Чтобы небыло проблем по типу "Hello world! undefined"
			expect(response.result.text).to.be.equal('Hello world! example');
		});
	})

	//...
}