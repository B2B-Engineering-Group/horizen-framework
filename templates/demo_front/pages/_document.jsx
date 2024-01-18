import { Html, Head, Main, NextScript } from 'next/document'

export default function Document(){
    return (
        <Html lang="ru">
            <Head>
               <link href="/globals.css" rel="stylesheet" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
