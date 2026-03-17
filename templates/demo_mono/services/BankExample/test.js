import {expect} from "chai";

export default Test;

function Test({db, config, BankExample, log}){
	it(`Проверяем получение транзакции по ID`, (done)=> { 
		const bankManager = new BankExample({db, config});

		expect(bankManager.getTransaction("1").id).to.be.equal("1");

		done();
	});
}

