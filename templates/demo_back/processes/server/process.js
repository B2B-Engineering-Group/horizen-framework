/**
 * Это шаблонный процесс, файл который запускается при вводе команды horizen-run server 
 * Его задача - инциализировать другие сущности и передать зависимости. 
 * 
 * Вы можете создавать собственные процессы, они будут запускаться в разных потоках.
 * 
 * Другие сущности
 * - Локальные сервисы (/services/) - оплот всей логики приложения (классы)
 * - API Контроллеры (/controllers/) - слушатели API запросов 
 * 
 * Все что вы пишите должно являтся либо процессом, либо локальным сервисом, либо контроллером.
 * Либо тестом одной из этих сущностей в заранее подготовленном месте. 
 **/
import Horizen from "horizen-framework/backend";

//Через конфиг передаются настройки которые отличаются на этапе разработки и продакшена.
//Конфиг в репозитории всегда применяется для разработки, для других целей подменяется автоматически.
import config from "../../config.json" assert {type: "json"};

const horizen = new Horizen(config.horizen);

export default horizen.init(async function(props, options){
	//props - объект с основными сервисами фреймворка (подробнее в .horizen-framework/backend/index.js)
	//options - объект с методами для конфигурации настроек фреймворка

	//Локальные сервисы и контроллеры автоматически экспортируются из директорий services и controllers, нужно только инциализировать
	const {localServices, controllers} = props;
	
	
	const bankExample = new localServices.BankExample(props); //Это пример сервиса
	const deps = {...props, config, bankExample};

	//Так вы можете устанавливать кастомные типы для валидатора.
	//При больших объемах схем необходимо выносить в локальный сервис.
	//Подсмотреть все базовые типы можно в .horizen-framework/backend/services/Validator и его тестах
	options.setCustomTypes(({string, number}) => ({
		anyString: ()=> string(/.{0,150}/)
	}));

	//Данный процесс возвращает объект с контроллерами и портом. Он будет слушать API запросы.
	//Такие процессы всегда работают в многопоточном режиме с репликацией под балансером и как следствие не должны содержать логику очередей.
	//Для очередей и однопоточных вычислений используйте демонов, такие же процессы но делают return null;
	return {
		port: config.horizen.ports.server,

		controllers: {
			post: [
				//Подключаем API контроллер GetHello
				controllers.GetHello(deps),//Пример сервиса и другие зависимости передаются в контроллер
			], 

			get: []
		}
	};
});