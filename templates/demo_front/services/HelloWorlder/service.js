export default Service;

function Service(){
    const self = this;

    self.sayHello = sayHello;

    function sayHello(){
        return "Hello World!"
    }
}

