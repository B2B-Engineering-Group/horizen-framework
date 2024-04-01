export default DaemonManager;

/**
 * Реализует паттерн однопоточного разбора очереди, который используется повсеместно.
 * Обеспечивает мониторинг и документацию по всем запущенным демонам.
 **/
function DaemonManager({config, healthManager}){
	const self = this;
   	let locked = false;

	self.daemons = {};
    self.setDaemon = setDaemon;
    self.lock = ()=> locked = true;
    
    async function setDaemon({name, desc, func, intervalMs, verbose = true}) {
    	let inprogress = false;

    	if(locked){
    		throw new Error(`[DaemonManager] Is not allowed to declare daemons after the module startup -> ${name}`);
    		process.exit(1);
    	}

    	if(self.daemons[name]){
    		throw new Error(`[DaemonManager] Daemon with name ${name} has been already declared.`);
    		process.exit(1);
    	}

    	self.daemons[name] = {desc, intervalMs};

    	await run();
        
        return setInterval(async ()=> {
        	await run();
        }, intervalMs);

        async function run(){
        	const timeStart = Date.now();

        	try { 
        		if(!inprogress){
	        		inprogress = true;
	                await func();

	                healthManager.log({
	                	scope: "daemon",
	                	type: "success",
	                	name: name,
	                	details: JSON.stringify({
	                		time: Date.now() - timeStart
	                	})
	                });

	                inprogress = false;
	        	}   
            } catch (e) {
            	if(verbose){console.log(e);}
                
                inprogress = false;

                healthManager.log({
                	scope: "daemon",
                	type: "error",
                	name: name,
                	details: JSON.stringify({error: "" + e})
                })
            }
        }
    }
}