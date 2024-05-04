import {expect} from "chai";

export default Test;

function Test({HelloWorlder}){
	erreer

	it(`Проверка метода сервиса`, async ()=> { 
		const helloWorlder = new HelloWorlder();
		const result = helloWorlder.sayHello();

		expect(result).to.be.equal("Hello World!");
	});
}