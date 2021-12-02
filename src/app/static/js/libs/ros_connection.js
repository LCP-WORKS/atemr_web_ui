define(function(require) {
    //require("./utils/roslib.min");
    class ROSConnectionClass{
        constructor(host) {
            this.ros = new ROSLIB.Ros();
            this.bisConnected = false;
            this.host = host;
            this._initROSEvents();
        }
    
        _initROSEvents(){
            this.ros.on('connection', function() {
                this.bisConnected = true;
                document.getElementById("idconnStatus").firstChild.data = "WS:ONLINE";
                console.log('Connected to websocket server.'); 
            }); 
                 
            this.ros.on('error', function(error) {
                this.bisConnected = false;
                document.getElementById("idconnStatus").firstChild.data = "WS:OFFLINE";
                document.getElementById("idconnStatus").firstChild.className = 'btn btn-secondary';
                console.log('Error connecting to websocket server: ', error); 
            });
            
            this.ros.on('close', function() {
                this.bisConnected = false;
                document.getElementById("idconnStatus").firstChild.data = "WS:OFFLINE";
                console.log('Connection to websocket server closed.');
            });
        }
    
        connect(){
            this.ros.connect(this.host);
        }
    
        isConnected(){
            return this.bisConnected;
        }
    
    }
    
    var robot = new ROSConnectionClass('ws://localhost:9090');
    return robot;
});

/*let robotStatus = async()=>{
    setInterval(function update_values() {
        $.getJSON(" http://127.0.0.1:5000/_connection",
            function(data) {
                sconnString = data.connection;
                if(sconnString === "CONNECTED")
                {
                    ros.connect(robot_url);
                    document.getElementById("idconnStatus").className = 'connected btn btn-secondary active';
                }
                else
                {
                    document.getElementById("idconnStatus").className = 'disconnected btn btn-secondary';
                }
            });
    }, 3000);
}
robotStatus();*/
