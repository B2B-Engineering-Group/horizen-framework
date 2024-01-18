import Horizen from "horizen-framework/backend";
import config from "../../config.json" assert {type: "json"};

const horizen = new Horizen(config.horizen);

export default horizen.init(async function(props, options){
	const {localServices, controllers} = props;
	const deps = {...props, config};
		
	options.setCustomTypes(({string, number}) => ({
		anyString: ()=> string(/.{0,150}/)
	}));

	return {
		port: config.horizen.ports.server,

		controllers: {
			post: [
				controllers.GetHello(deps),
			], 

			get: []
		}
	};
});