import {expect} from "chai";

export default Test;

function Test({config, url, log}){
	describe("Получение приветствий", function(){
		it(`Должен вернуть Hello`, async ()=> { 
			const response = await (await fetch(`${url}/api/getHello`, {
			    method: "POST",
			    headers: { 
			    	 "Content-Type": "application/json",
			    	 "token": "1" 
			    },
			    body: JSON.stringify({
			    	example: "example"
			    })
			})).json();
		
			expect(response.result.text).to.be.equal('Hello world! example');
		});
	})
}

