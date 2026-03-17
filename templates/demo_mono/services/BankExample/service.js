export default Service;

import Tinkoff from "./providers/Tinkoff.js";
import SberBank from "./providers/SberBank.js";

function Service({db, config, setDaemon}){
    const self = this;
    const providers = {
        "Tinkoff": new Tinkoff({db, config}),
        "SberBank": new SberBank({db, config})
    }
    
    self.getTransaction = getTransaction;
    self.initPayment = initPayment;
    self.watchTransactions = watchTransactions;
   
    function initPayment({amount, provider}){
        //providers[provider]....
    }

    function getTransaction(id){
        return {id};
    }

    async function watchTransactions(){
        await setDaemon({ 
            name: "Отслеживаем пополнения в банках",
            desc: "Опрашиваем каждый банк, если платеж прошел, помечаем как выполненный",
            func: async ()=> {}, 
            intervalMs: 10000
        });
    }
}

