import React from 'react';
import Head from 'next/head';
import Error from 'next/error';
import {api} from 'horizen-framework/frontend';
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
        await this.getHello();
    }

    getHello = async ()=> {
        const result = await api.call("getHello", {
            auth: false,
            params: {}
        });

        this.setState({text: result.text});
    }

    render(){
       return (
            <main className="min-h-screen flex justify-center items-center">
                <div className="text-6xl">
                    {this.state.text || "Бэк недоступен"}
                </div>  
            </main>
        )
    }
}

export default withRouter(WrappApp);