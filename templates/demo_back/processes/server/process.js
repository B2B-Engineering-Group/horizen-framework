/**
 * Это шаблонный процесс, файл который запускается при вводе команды horizen-run server 
 * Его задача - инциализировать другие сущности и передать зависимости. 
 * 
 * Вы можете создавать собственные процессы, они будут запускаться в разных контейнерах. 
 * Для этого создайте папку в разделе proccesses с такой же структурой как эта.
 * 
 * Другие структурные сущности
 * - Локальные сервисы (/services/) - оплот всей логики приложения (классы)
 * - API Контроллеры (/controllers/) - слушатели API запросов 
 * 
 * Все что вы пишите должно являтся либо процессом, либо локальным сервисом, либо контроллером.
 * Либо тестом одной из этих сущностей в заранее подготовленном месте. 
 **/
import Horizen from "horizen-framework/backend";

/*
  [Файл конфигурации]
  
  Через конфиг передаются настройки которые отличаются на этапе разработки и продакшена.
  Конфиг из репозитория применяется для разработки, для других целей подменяется автоматически.
  (!) Все кастомные параметры которые вы хотите прокинуть в процесс, нужно писать в секции env. 
  (!) Секция horizen - служебная.
*/
import config from "../../config.json" assert {type: "json"};

const horizen = new Horizen(config.horizen);


/* 
	[Этап инициализации фреймворка] 
	===============================
	- props - объект с основными сервисами (подробнее смотреть в .horizen-framework/backend/index.js)
	
	{
		localServices: {BankExample}, //Локальные сервисы, автоматически экспортируются из папок
		controllers: {GetHello}, 	  //Локальные контроллеры, автоматически экспортируются из папок	
		setDaemon: function, 		  //Запуск однопоточных демонов
		gfs: , 						  //Работа с файлами через GridFs
		dbTransaction: function, 	  //Атомарные транзакции в MongoDB (только внутри репликасета)
		db: function 				  //Короткая форма для db.collection() классического драйвера
	}

	===============================
	- options - объект с методами для конфигурации настроек
	
	{
		setCustomTypes: function, //Установка кастомных типов для валидатора
		setMongoIndex: function, //Установка индексов для MongoDB
	}
	===============================

	(!) Есть и другие сервисы и опции. Они не описаны здесь, т.к используются редко и 
	    только по согласованию, т.к зависят от глобальной архитектуры. 
*/
export default horizen.init(async function(props, options){
	const {localServices, controllers} = props;
	const bankExample = new localServices.BankExample(props); //Пример инициализации сервиса
	const deps = {...props, config, bankExample};

	bankExample.watchTransactions();//Запуск демона из сервиса

	//Так вы можете устанавливать кастомные типы для валидатора.
	//При больших объемах схем необходимо выносить в локальный сервис.
	//Подсмотреть все базовые типы можно в .horizen-framework/backend/services/Validator и его тестах
	//Это не динамичная структура, добавлять нужно все и сразу.
	options.setCustomTypes(({string, number}) => ({
		anyString: ()=> string(/.{0,150}/)
	}));
	
	//Когда произошел return, инциализация завершается. Демоны должны быть инициализированы выше.
	//Сервер начинает слушать запросы. Имейте ввиду, даже если вы не добавили контроллеры,
	//есть несколько скрытых, которые нужны для инфраструктуры.
	return {
		//Порты для каждого процесса прописываются в конфиге, название должно соответствовать папке
		port: config.horizen.ports.server,

		controllers: {
			post: [
				//Подключаем API контроллер GetHello, передаем туда сервисы и другие зависимости
				controllers.GetHello(deps),
			], 

			get: []
		}
	};
});
