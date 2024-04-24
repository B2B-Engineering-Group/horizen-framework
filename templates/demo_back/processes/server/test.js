import {expect} from "chai";

export default Test;

/**
 * Предполагается что вы разрабатываете через unit тесты, разнесли всю логику по 
 * сервисам и оставили контроллеры максимально легкими. 
 * 
 * Чтобы избежать багов, связанных валидацией, пробросом зависимостей и вызовом сервисов 
 * рекомендуется дополнительно покрывать контроллеры дымными E2E тестами, это поможет 
 * коллегам не терять время на этапе интеграции.
 * 
 * Также E2E могут помочь при разработке хитрых пользовательских цепочек.
 **/
function Test({config, url, log}){
	describe("Получение приветствий", function(){
		it(`Должен вернуть Hello`, async ()=> { 
			const response = await (await fetch(`${url}/api/getHello`, {
			    method: "POST",

			    //Если к методу применяется какая-либо авторизационная стратегия
			    //Можно обойти запросы к auth_api, это работает только для тестов.
			    //Нужно передать в заголовках числовой token или api_key, тогда запрос пройдет.
			    //token: "1" -> {userId: 1} или api_key: "2" -> {appId: 1}
			    headers: { "token": "1" },
			    body: JSON.stringify({
			    	example: "example"
			    })
			})).json();

			//Важно проверять ключевые точки ответов во время тестирования 
			//Чтобы небыло проблем по типу "Hello world! undefined"
			expect(response.result.text).to.be.equal('Hello world! example');
		});
	})
}