import {expect} from "chai";

export default Test;

//Больше примеров юнит-тестов вы найдете в .horizen-framework/backend/services
//Провайдеры необходимо импортировать напрямую
function Test({db, config, BankExample}){
	it(`Проверяем получение транзакции по ID`, (done)=> { 
		const bankManager = new BankExample({db, config});

		expect(bankManager.getTransaction("1").id).to.be.equal("1");

		done();
	});
}