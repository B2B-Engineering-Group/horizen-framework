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
 * [Стайлгайд] Декларация функций всегда в самом внизу
 * [Стайлгайд] Дробите большие функции на мелкие тестируемые куски с понятными названиями
 * [Стайлгайд] Вверху собирайте логику из таких функций таким образом, чтобы в ней нельзя было ошибиться
 **/
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

    function doSomthing(){
        //...
    }

    /**
     * [Пример однопоточного демона]
     * 
     * Когда перед вами встанет задача требующая фоновых вычислений. Например обработки 
     * сотен изображений, генерации чего-то или синхронизации с чем-то и т.д. Используйте 
     * однопоточных демонов в отдельном от основного API процессе.
     * 
     * Демон будет запускать указанную функцию с определенным интервалом (исключая случаи 
     * когда она все еще выполняется с момента прошого запуска). Все ошибки и успехи будут 
     * транслироваться в мониторинг инфраструктуры, а текст который вы укажете попадет в 
     * документацию. Поэтому прописывайте что делает демон
     * 
     * ps
     * Не стоит использовать демонов в процессе, который предоставляет API. 
     * Демоны - однопоточные, а API всегда идет под балансер. Если туда попадут 
     * подобные вычисления, будут рейсы.
     **/
    async function watchTransactions(){
        //Можно с await, можно без. Если укажете то он дождется выполнения первой итерации
        await setDaemon({ 
            name: "Отслеживаем пополнения в банках",
            desc: "Опрашиваем каждый банк, если платеж прошел, помечаем как выполненный",
            func: checkPaymentsStatus, 
            intervalMs: 10000
        });

        async function checkPaymentsStatus(){
            //providers[provider]....
            //Кидайте throw new Errror("something") - в случае любой ошибки
        }
    }
}

