import {expect} from "chai";

export default Test;

function Test({HealthManager}) {
	it(`Добавление событий в лог`, (done)=> { 
		const healthManager = new HealthManager({});

		healthManager.log({
			scope: "test", 
			type: "test", 
			name: "test", 
			details: JSON.stringify({test: 1}),
		});

		expect(healthManager.records.length).to.be.equal(1);

		done();
	});

	it(`Очистка лога при переполнении с информацией`, (done)=> { 
		const healthManager = new HealthManager({});

		for(let key of new Array(1001)){
			healthManager.log({
				scope: "test", 
				type: "test", 
				name: "test", 
				details: JSON.stringify({test: 1})
			});
		}

		expect(healthManager.records.length).to.be.equal(2);
		expect(healthManager.records[0].details).to.be.equal('{"test_test_test":1000}');

		done();
	});
}