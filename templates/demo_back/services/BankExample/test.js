import {expect} from "chai";

export default Test;

//Больше примеров юнит-тестов вы найдете в .horizen-framework/backend/services
//Провайдеры необходимо импортировать напрямую
//В тесты в параметрах передаются все локальные сервисы, база и конфиг
//console.log по умолчанию недоступен, используйте log или запускайте тестер с флагом --verbose
function Test({db, config, BankExample, log}){
	it(`Проверяем получение транзакции по ID`, (done)=> { 
		const bankManager = new BankExample({db, config});

		expect(bankManager.getTransaction("1").id).to.be.equal("1");

		done();
	});
}