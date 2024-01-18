import colors from "@colors/colors/safe.js";

export default Logger;

function Logger({config, TelegramBot, verbose = true}){
	const isConfigExists = config.logger && config.logger.bot && config.logger.channels;
	const bot = isConfigExists && new TelegramBot(config.logger.bot, {polling: false});	

	return {
		debug: async (...args)=> {
			if(verbose){
				console.log.apply(null, [colors.blue(dateTime())].concat(args));
			}

			if(bot && config.logger.channels.debug){
				try{
					await bot.sendMessage(config.logger.channels.debug, `
					<b>⚙️ [${(config.name || "").toUpperCase()}] [DEBUG]</b>

					${JSON.stringify(args).substring(0, 1000)}
					`, {parse_mode: "HTML"});
				}catch(e){
					console.log(colors.blue(dateTime()), "Ошибка отправки евента в телеграмм", e);
				}
			}
		},

		info: async (...args)=> { 
			if(verbose){
				console.log.apply(null, [colors.green(dateTime())].concat(args));
			}

			if(bot && config.logger.channels.info){
				try{
					await bot.sendMessage(config.logger.channels.info, `
					<b>🟢 [${(config.name || "").toUpperCase()}] [INFO]</b>

					${JSON.stringify(args).substring(0, 1000)}
					`, {parse_mode: "HTML"});
				}catch(e){
					console.log(colors.green(dateTime()), "Ошибка отправки евента в телеграмм", e);
				}
			}
		},

		fatal: async (...args)=> {
			if(verbose){
				console.log.apply(null, [colors.red(dateTime())].concat(args));
			}

			if(bot && config.logger.channels.fatal){
				try{
					await bot.sendMessage(config.logger.channels.fatal, `
					<b>💀 [${(config.name || "").toUpperCase()}] [FATAL ERROR]</b>

					${JSON.stringify(args).substring(0, 1000)}
					`, {parse_mode: "HTML"});
				}catch(e){
					console.log(colors.red(dateTime()), "Ошибка отправки евента в телеграмм", e);
				}

				if(verbose){
					process.exit(1);
				}
			}
		},

		error: async (...args)=> {
			if(verbose){
				console.log.apply(null, [colors.red(dateTime())].concat(args));
			}

			if(bot && config.logger.channels.error){
				try{
					await bot.sendMessage(config.logger.channels.error, `
					<b>🔴 [${(config.name || "").toUpperCase()}] [ERROR]</b>

					${JSON.stringify(args).substring(0, 1000)}
					`, {parse_mode: "HTML"});
				}catch(e){
					console.log(colors.red(dateTime()), "Ошибка отправки евента в телеграмм", e);
				}
			}
		},

		warn: async (...args)=> {
			if(verbose){
				console.log.apply(null, [colors.yellow(dateTime())].concat(args));
			}

			if(bot && config.logger.channels.warn){
				try{
					await bot.sendMessage(config.logger.channels.warn, `
					<b>🟠 [${(config.name || "").toUpperCase()}] [WARNING]</b>

					${JSON.stringify(args).substring(0, 1000)}
					`, {parse_mode: "HTML"});
				} catch(e){
					console.log(colors.yellow(dateTime()), "Ошибка отправки евента в телеграмм", e);
				}
			}
		},
	};

	function dateTime(){
		return `[${new Date().toLocaleString("ru-RU", {timeZone: "Europe/Moscow"})}]`
	}
}