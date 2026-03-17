export default function(props){
	props.setController("GetHello", function({db, bankExample}){
		return {
			endpoint: "/api/getHello",
			auth: "bypass",
			description: "Возвращает приветствие",
			errors: {},
			
			reqSchema: ({string}, {anyString})=> ({
				example: string(/.{1,100}/).optional(),
			}),

			resSchema: ({}, {anyString})=> ({
				text: anyString()
			}),

			controller: async function({body}){
				return {text: "Hello world! " + body.example}
			}
		}
	})
}

