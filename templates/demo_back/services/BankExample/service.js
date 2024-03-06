export default Service;

import Tinkoff from "./providers/Tinkoff.js";
import SberBank from "./providers/SberBank.js";

/**
 * Это шаблонный сервис с примерами. Сервисы - оплот всей логики приложения.
 * Каждый сервис представляет из себя функциональный класс какой-то сущности. 
 *
 * 1. Сервисы тестируются через Unit тесты в файле ./test.js.
 * 
 * 2. Мы используем полиморфизм на базе провайдеров. Т.е сервис должен экспортировать 
 * методы для основной сущности. Если в вашей задаче сущность подразумевает горизонтальное 
 * масштабирование определенных участков (разные виды одной и той же сущности), то необходимо 
 * сделать папку провайдеров и описывать их там, оставляя в сервисе только общую логику. 
 * Струкутора папкок(и) провайдеров не регламентируется, но они должны быть тестируемые.
 *
 * Например: в этом примере, есть разные банки и везде функция создания платежа. API разных 
 * банков отличается, поэтому логика по работе с их апи замыкается по провайдерам и выносится 
 * в единый интерфейс в сервисе.
 * 
 * 3. Учтите следующие стилистические моменты, они касаются всего вашего кода, но тут наглядно.
 * 
 * [Стайлгайд] Декларация перменных всегда вверху
 * [Стайлгайд] Экспорт свойств и методов под блоком с переменными
 * [Стайлгайд] Вызовы функций и другая логика всегда между экспортом и декларацией
 * [Стайлгайд] Декларация функций всегда в самом внизу
 **/
function Service({db, config}){
    const self = this;
    const providers = {
        "Tinkoff": new Tinkoff({db, config}),
        "SberBank": new SberBank({db, config})
    }
    
    self.getTransaction = getTransaction;
    self.initPayment = initPayment;
    self.watchTransactions = watchTransactions;
    
    doSomthing();
   
    function initPayment({amount, provider}){
        //providers[provider]....
    }

    function getTransaction(id){
        return {id};
    }

    function doSomthing(){
        //...
    }

    function watchTransactions(){
        setInterval(getActiveTrasactions, 1000);

        function getActiveTrasactions(){
            //...
        }
    }
}