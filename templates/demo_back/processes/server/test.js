import startedProcess from "./process.js";
import {expect} from "chai";

export default Test;

function Test({config}){
	const url = `http://127.0.0.1:${config.horizen.ports.server}`

	describe("Проверка бизнес-цепочки", function(){
		it(`Должен вернуть Hello`, async ()=> { 
			const response = await (await fetch(`${url}/api/getHello`, {
			    method: "POST",
			    headers: { "Content-Type": "application/json"},
			    body: JSON.stringify({
			    	example: "example"
			    })
			})).json();

			expect(response.result.text).to.be.equal('Hello world! example');
		});
	})
}