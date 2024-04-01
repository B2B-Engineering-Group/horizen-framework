import React from 'react';
import IframeResizer from 'iframe-resizer-react';

export default class Iframe extends React.Component {
    static defaultProps = {
        className: "",
        
    }

    constructor(props){
        super(props);

      //  this.ref = React.createRef();
        this.state = {
            messageData: null
        };

        
    }

    onResized = (data)=> {
        this.setState({messageData: data})
    }

    render(){
        return (<div></div>)
    }
}


/*


      onMessage={onMessage}

export default ({src}) => {
  const iframeRef = useRef(null)
  const [messageData, setMessageData] = useState()

  const onResized = data => setMessageData(data)

  const onMessage = data => {
    setMessageData(data)
    iframeRef.current.sendMessage('Hello back from the parent page')
  }

  return (
    <div>
        <IframeResizer
            forwardRef={iframeRef}
            heightCalculationMethod="lowestElement"
            inPageLinks
            log
            onMessage={onMessage}
            onResized={onResized}
            src={src}
            style={{ width: '1px', minWidth: '100%'}}
        />
    </div>
  )
}
*/