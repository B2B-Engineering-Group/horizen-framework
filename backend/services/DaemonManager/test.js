import {expect} from "chai";
import bodyParser from 'body-parser';
import express from "express";

export default Test;

function Test({db, DaemonManager, HealthManager}) {
    it(`Базовая проверка работоспособности`, async () => {
    	let test = 0;
        
        const healthManager = new HealthManager({});
    	const daemonManager = new DaemonManager({healthManager});
        const id = await daemonManager.setDaemon({
        	name: "Тестовый демон",
        	desc: "Описание для документации",
        	func: async ()=> test++, 
        	intervalMs: 300
        });
        
        expect(test).to.be.equal(1);
        expect(healthManager.records[0].type).to.be.equal("success");
        await wait(600);

        expect(test > 1).to.be.equal(true);

       	clearInterval(id);
    });

    it(`Проверка лога ошибок`, async () => {
        let test = 0;
        
        const healthManager = new HealthManager({});
        const daemonManager = new DaemonManager({healthManager});
        const id = await daemonManager.setDaemon({
            verbose: false,
            name: "Тестовый демон",
            desc: "Описание для документации",
            func: async ()=> {
                throw new Error("текст ошибки");
            }, 

            intervalMs: 300
        });
       
        expect(healthManager.records[0].details).to.be.equal('{"error":"Error: текст ошибки"}');
        clearInterval(id);
    });
}

function wait(ms){
    return new Promise(function(resolve){
        setTimeout(resolve, ms)
    })
}
