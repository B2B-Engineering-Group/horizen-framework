export default function({db}){
	return {
		endpoint: "/api/getHello",
		auth: "bypass",
		description: "",
		errors: {},
		
		reqSchema: ({string, object, array, number, any}, {})=> ({
			example: string(/.{1,100}/),
		}),

		resSchema: ({string, object, array, number, any}, {})=> ({
			text: string(/.{1,100}/)
		}),

		controller: async function({body, auth, req, res}){
			//await db("demo").insert({text: "Hello world!"});
			//console.log(await db("demo").find({}).toArray());
			return {text: "Hello world! " + body.example}
		}
	}
}