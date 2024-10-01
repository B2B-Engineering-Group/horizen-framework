import React, { useEffect, useState } from "react";
import {api, hFrame} from 'horizen-framework/frontend';


export async function getServerSideProps({resolvedUrl}){
    const promises = [getHello()];
    const [text] = await Promise.all(promises);

    return { props: {text}};

    //[PS 1] Ожидается что все методы для работы с API будут вынесены в отдельный сервис
    //[PS 2] обратить внимание на аутентификацию, она работает только вне SSR
    async function getHello(){
        const result = await api.call("getHello", {
            //Если true - будет прикладываться авторизационный ключ, если false - не будет
            //Поскольку SSR делается только для SEO страниц, при серверном рендеринге 
            //мы никогда не запрашиваем апи с ключами внутри getServerSideProps
            auth: false,
            params: {
                example: "✅"
            }
        });

        return result.text;
    }
}

export default function App({text}){
    const [height, setHeight] = useState(0);

    useEffect(() => {
        //Пример встраиваемого внешнего микросервиса 
        //Должен быть инциализрован до появления iframe
        //Позволяет получать высоту и параметры из url
        //name зависит от названия интегрируемого модуля в его config.json
        hFrame.addListener(({name, height, path})=> {
            setHeight(height);
        });
        
        return ()=> {
            hFrame.removeListener();
        }
    }, []);    

    return (
        <main className="min-h-screen flex justify-center items-center bg-gray-200">
            <div className="w-[90rem]">
                <div className="p-[2rem] mt-[2rem] text-6xl text-center">{text || "Бэк недоступен"}</div>

                {text && 
                    <div className={`shadow-2xl mt-4 w-full bg-white`}>
                        <iframe style={{width: "1px", minWidth: "100%", height: (height || 0) + "px", minHeight: "100%", overflow: "hidden"}} 
                                src={"https://b2b.engineering"} 
                                scrolling="no"
                        />
                    </div>
                }
            </div>  
        </main>
    )
}