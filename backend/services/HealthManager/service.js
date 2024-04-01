export default HealthManager;

/**
 * Скрытый под инфраструктурой сервис, обеспечивает мониторинг всех ключевых узлов.
 * Мониторинг заключается в контроле и детализации вызовов тех или иных уровней,
 * профайлинг их работы и статусы успеха.
 * 
 * 1. Уровень API самого модуля
 * 2. Уровень запросов к API других модулей
 * 3. Демоны и бизнес-цепочки
 * 
 * Помогает выявить проблемы в работающей инфраструктуре.
 **/
function HealthManager({config}){
	const self = this;

	self.scopes = {};
	self.records = [];
	self.log = log;
	self.controllers = {GetHealthInfo};

	function log({scope, type, name, details}){
		if(self.records.length < 1000){
			pushLog();
		} else {
			cleanOverfullLog();
			pushLog();
		}

		function cleanOverfullLog(){
			self.records = [];
			self.records.push({
				scope: "health",
				type: "warning",
				name: "Переполнение стэка записей",
				details: JSON.stringify(self.scopes),
				ts: Date.now()
			});
			self.scopes = {};
		}

		function pushLog(){
			const infoKey = `${scope}_${type}_${name}`;

			self.scopes[infoKey] = self.scopes[infoKey] ||0;
			self.scopes[infoKey]++;
			self.records.push({
				scope: "" + scope, 
				type: "" + type, 
				name: "" + name, 
				details: ("" + details).substr(0, 999),
				ts: Date.now()
			});
		}
	}

	function GetHealthInfo(){
		return {
			endpoint: "/api/health",
			auth: "authorized:app",
			description: "Отдает информацию о состоянии модуля",
			errors: {},
			
			reqSchema: ({}, {})=> ({}),
			resSchema: ({array, object, string, number}, {})=> ({
				records: array(object({
					scope: string(/.{0,100}/),
					type: string(/.{0,100}/),
					name: string(/.{0,100}/),
					details: string(/.{0,1000}/),
					ts: number(/[0-9]{1,100}/)
				}))
			}),

			controller: async function({body, authResult, req, res}){
				const result = {records: self.records};
			
				self.scopes = {};
				self.records = [];

				return result;
			}
		}
	}
}