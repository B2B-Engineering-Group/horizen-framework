import {expect} from "chai";

export default Test;

function Test({HealthManager}) {
	const config = {
		api_key: "democode",
		name: "module: name",

		microservices: {},

		logger: {
			bot: "abcd",

			channels: {
				info: "infoid",
				fatal: "fatalid",
				error: "errorid",
				debug: "debugid",
				warn: "warnid"
			}
		}
	};

	it(`HealthManager отправляет события`, (done)=> { 
		(async function(){
			const healthManager = new HealthManager({config, TelegramBot, verbose: false});
			const channels = ["infoid", "fatalid", "errorid", "debugid", "warnid"];
		
			await healthManager.info(["something", new Error("info")]);
			await healthManager.fatal(["something", new Error("fatal")]);
			await healthManager.warn(["something", new Error("warn")]);
			await healthManager.error(["something", new Error("error")]);
			await healthManager.debug(["something", new Error("debug")]);

			function TelegramBot(){
				return {
					sendMessage: function(channel){
						channels.splice(channels.indexOf(channel), 1);
						
						if(!channels.length){
							done();
						}
					}
				}
			}
		})();
	});
}