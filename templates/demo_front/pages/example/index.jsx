import React from 'react';
import Head from 'next/head';
import Error from 'next/error';
import {api, hFrame} from 'horizen-framework/frontend';
import { withRouter } from 'next/router'

class WrappApp extends React.Component {
    static getInitialProps({ query }){
        return { query }
    }

    constructor(props){
        super(props);

        this.state = {}
    }

    async componentDidMount(){
        //Пример запроса к бэкенду
        await this.getHello();

        //Пример встраиваемого внешнего микросервиса 
        //Должен быть инциализрован до появления iframe
        //Позволяет получать высоту и параметры из url
        //name зависит от названия интегрируемого модуля в его config.json
        await hFrame.addListener(({name, height, path})=> {
            this.setState({height});
        });

        this.setState({ ready: true });
    }

    async componentWillUnmount(){
        hFrame.removeListener();
    }

    getHello = async ()=> {
        const result = await api.call("getHello", {
            auth: true,//Если true - будет прикладываться авторизационный ключ, если false - не будет
            params: {
                example: "✅"
            }
        });

        this.setState({text: result.text});
    }

    render(){
        return (
            <main className="min-h-screen flex justify-center items-center bg-gray-200">
                <div className="w-[90rem]">
                    <div className="p-[2rem] mt-[2rem] text-6xl text-center">{this.state.text || "Бэк недоступен"}</div>

                    {this.state.ready && 
                        <div className={`shadow-2xl mt-4 w-full bg-white`}>
                            <iframe style={{width: "1px", minWidth: "100%", height: (this.state.height || 0) + "px", minHeight: "100%", overflow: "hidden"}} 
                                    src={"https://b2b.engineering"} 
                                    scrolling="no"
                            />
                        </div>
                    }
                </div>  
            </main>
        )
    }
}

export default withRouter(WrappApp);