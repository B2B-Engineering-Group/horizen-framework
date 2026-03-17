import React, { useEffect, useState } from "react";
import {api, hFrame} from 'horizen-framework/frontend';

export async function getServerSideProps(){
    const [text] = await Promise.all([getHello()]);

    return { props: {text}};

    async function getHello(){
        const result = await api.call("getHello", {
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
        hFrame.addListener(({height})=> {
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

