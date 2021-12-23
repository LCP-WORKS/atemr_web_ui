define(function(require) {
    //require("./utils/roslib.min");
    var bisConnected = false;
    class ROSConnectionClass{
        constructor(host) {
            this.ros = new ROSLIB.Ros();
            this.host = host;
            this._initROSEvents();
            this.webstatusPub = new ROSLIB.Topic({
                ros : this.ros,
                name: '/webserver_status',
                messageType: 'atemr_msgs/WebStatus'
            });
            this.joyPub = new ROSLIB.Topic({
                ros : this.ros,
                name: '/web_joy/cmd_vel',
                messageType: 'geometry_msgs/Twist'
            });
            this.agentstatusSub = new ROSLIB.Topic({
                ros : this.ros,
                name: '/agent_status',
                messageType: 'atemr_msgs/AgentStatus'
            });
            this.feedbackSub = new ROSLIB.Topic({
                ros : this.ros,
                name: '/base_controller/feedback',
                messageType: 'atemr_msgs/Feedback'
            });
            this.agentClient = new ROSLIB.Service({
                ros : this.ros,
                name: '/WebUIServer',
                serviceType: 'atemr_msgs/WebService'
            });

            //nav/map visualizaiton
            if(($(location).attr('pathname').substring(1) === 'control'))
                this.activateNavGrid();
            if (($(location).attr('pathname').substring(1) === 'mapping'))
                this.activateMapGrid();
            
        }
    
        _initROSEvents(){
            this.ros.on('connection', function() {
                bisConnected = true;
                document.getElementById("idconnStatus").firstChild.data = "WS:ONLINE";
                //document.getElementById("idconnStatus").className = 'connected btn btn-secondary';
                console.log('Connected to websocket server.'); 
            }); 
                 
            this.ros.on('error', function(error) {
                bisConnected = false;
                document.getElementById("idconnStatus").firstChild.data = "WS:ERROR";
                //document.getElementById("idconnStatus").className = 'semi-connected btn btn-secondary';
                console.log('Error connecting to websocket server: ', error); 
            });
            
            this.ros.on('close', function() {
                bisConnected = false;
                document.getElementById("idconnStatus").firstChild.data = "WS:OFFLINE";
                console.log('Connection to websocket server closed.');
            });
        }
    
        connect(){
            this.ros.connect(this.host);
        }
    
        isConnected(){
            return bisConnected;
        }

        // broadcasts ros websocket status
        broadcastWebStatus(data){
            var msg = new ROSLIB.Message({
                isAlive : {
                    data: true
                }
            });
            this.webstatusPub.publish(msg);
        }

        setMode(data){
            var request = new ROSLIB.ServiceRequest({
                is_man_auto : {
                    data : true
                },
                manAuto : data
            });
            this.agentClient.callService(request, function(result){
                //console.log(result);
            });
        }

        activateMapGrid()
        {//map visualization
            console.log('NavGrid');
            var viewer = new ROS2D.Viewer({
                divID: 'idmapVisualDiv',
                width: 800,
                height: 380
            });
            var gridClient = new ROS2D.OccupancyGridClient({
                ros: this.ros,
                rootObject: viewer.scene
            });
            gridClient.on('change', function(){
                viewer.scaleToDimensions(gridClient.currentGrid.width, gridClient.currentGrid.height);
            });
        }

        activateNavGrid()
        {//nav visualization
            console.log('NavGrid');
            var viewer = new ROS2D.Viewer({
                divID: 'idnavVisualDiv',
                width: 800,
                height: 380
            });
            var nav = new NAV2D.OccupancyGridClientNav({
                ros: this.ros,
                rootObject: viewer.scene,
                viewer: viewer,
                serverName: '/move_base'
                //image: 'turtlebot.png'
            });
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
                    document.getElementById("idconnStatus").className = 'connected btn btn-secondary';
                }
                else
                {
                    document.getElementById("idconnStatus").className = 'disconnected btn btn-secondary';
                }
            });
    }, 3000);
}
robotStatus();*/
