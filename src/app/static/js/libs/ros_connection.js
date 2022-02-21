define(function(require) {
    //require("./utils/roslib.min");
    var bisConnected = false;
    var canVisualizeScan = false;
    if(($(location).attr('pathname').substring(1) === 'control') || ($(location).attr('pathname').substring(1) === 'mapping')){
        var viewer = new ROS2D.Viewer({
            divID: 'idmapVisualDiv',
            width: 800,
            height: 380
        });
        // Add zoom to the viewer.
        var zoomView = new ROS2D.ZoomView({
            rootObject : viewer.scene
        });
        // Add panning to the viewer.
        var panView = new ROS2D.PanView({
            rootObject : viewer.scene
        });

        function registerMouseHandlers() {
            // Setup mouse event handlers
            var mouseDown = false;
            var zoomKey = false;
            var panKey = false;
            var startPos = new ROSLIB.Vector3();
            viewer.scene.addEventListener('stagemousedown', function(event) {
                if (event.nativeEvent.ctrlKey === true) {
                    zoomKey = true;
                    zoomView.startZoom(event.stageX, event.stageY);
                }
                else if (event.nativeEvent.shiftKey === true) {
                    panKey = true;
                    panView.startPan(event.stageX, event.stageY);
                }
                startPos.x = event.stageX;
                startPos.y = event.stageY;
                mouseDown = true;
            });
            viewer.scene.addEventListener('stagemousemove', function(event) {
                if (mouseDown === true) {
                    if (zoomKey === true) {
                        var dy = event.stageY - startPos.y;
                        var zoom = 1 + 10*Math.abs(dy) / viewer.scene.canvas.clientHeight;
                        if (dy < 0)
                            zoom = 1 / zoom;
                        zoomView.zoom(zoom);
                    }
                    else if (panKey === true) {
                        panView.pan(event.stageX, event.stageY);
                    }
                }
            });
            viewer.scene.addEventListener('stagemouseup', function(event) {
                if (mouseDown === true) {
                    if (zoomKey === true) {
                        zoomKey = false;
                    }
                    else if (panKey === true) {
                        panKey = false;
                    }
                    mouseDown = false;
                }
            });
        }
    }

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
            this.webstatusPub.advertise();

            this.joyPub = new ROSLIB.Topic({
                ros : this.ros,
                name: '/web_joy/cmd_vel',
                messageType: 'geometry_msgs/Twist'
            });
            this.joyPub.advertise();

            this.agentstatusSub = new ROSLIB.Topic({
                ros : this.ros,
                name: '/agent_status',
                messageType: 'atemr_msgs/AgentStatus'
            });
            this.feedbackSub = new ROSLIB.Topic({
                ros : this.ros,
                name: '/odometry/filtered_odom',
                messageType: 'nav_msgs/Odometry'
            });
            this.agentClient = new ROSLIB.Service({
                ros : this.ros,
                name: '/WebUIServer',
                serviceType: 'atemr_msgs/WebService'
            });
            this.dbusClient = new ROSLIB.Service({
                ros : this.ros,
                name: '/DBUSServer',
                serviceType: 'atemr_msgs/DBUSService'
            });
            this.dbusSub = new ROSLIB.Topic({
                ros : this.ros,
                name: '/connection_status',
                messageType: 'std_msgs/String'
            });
            this.max_linear_vel = new ROSLIB.Param({
                ros : this.ros,
                name : '/max_lin_vel'
            });
            this.max_angular_vel = new ROSLIB.Param({
                ros : this.ros,
                name : '/max_ang_vel'
            });
            this.active_map = new ROSLIB.Param({
                ros : this.ros,
                name : '/current_map'
            });
            this.kb_teleop = new KEYBOARDTELEOP.Teleop({
                ros: this.ros,
                topic: '/web_joy/cmd_vel'
            });
            this.cameraStream = new ROSLIB.Topic({
                ros : this.ros,
                name: '/camera/color/image_raw/compressed',
                messageType: 'sensor_msgs/CompressedImage'
            });

            //nav/map visualizaiton
            if(($(location).attr('pathname').substring(1) === 'control')){
                this.activateNavGrid();
                registerMouseHandlers();
                this.activateLaserViz();
            }
            if (($(location).attr('pathname').substring(1) === 'mapping')){
                this.activateMapGrid();
                registerMouseHandlers();
                this.activateLaserViz();
            }
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
    
        connect(host=''){
            if(host === '')
                this.ros.connect(this.host);
            else this.ros.connect(host);
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

        // trigger begin/ end map
        makeMap(code, name='empty'){
            var request = new ROSLIB.ServiceRequest({
                is_map_action : {
                    data : true
                },
                mapAction : code, //31 -> BEGIN, 33 -> SAVE, 34 -> DISCARD
                mapName : {
                    data : name
                }
            });
            this.agentClient.callService(request, function(result){
                //console.log(result);
            });
        }

        //-----------SETTINGS PAGE ----------------------------------
        sendWifiConfig(ssid, passwd){
            var request = new ROSLIB.ServiceRequest({
                setNetwork : {
                    data : true
                },
                WIFI_SSID : {
                    data : ssid
                },
                WIFI_PASS : {
                    data : passwd
                }
            });
            this.dbusClient.callService(request, function(result){
                //console.log(result);
            });
        }

        captureMedia(data = 0){
            if(data === 1) //start video record
            {
                var request = new ROSLIB.ServiceRequest({
                    is_stream : {
                        data : true
                    },
                    captureVideo : 81
                });
            }
            else if(data === 2){//save video record
                var request = new ROSLIB.ServiceRequest({
                    is_stream : {
                        data : true
                    },
                    captureVideo : 82
                });
            }
            else if(data === 3){//cancel video record
                var request = new ROSLIB.ServiceRequest({
                    is_stream : {
                        data : true
                    },
                    captureVideo : 83
                });
            }
            else{ // capture image
                var request = new ROSLIB.ServiceRequest({
                    is_stream : {
                        data : true
                    },
                    captureImage : {
                        data : true
                    }
                });
            }
            
            this.agentClient.callService(request, function(result){
                //console.log(result);
            });
        }

        //map visualization
        activateMapGrid()
        {
            var gridClient = new ROS2D.OccupancyGridClient({
                ros: this.ros,
                rootObject: viewer.scene,
                continuous: true
            });
            gridClient.on('change', function(){
                viewer.scaleToDimensions(gridClient.currentGrid.width, gridClient.currentGrid.height);
                viewer.shift(gridClient.currentGrid.pose.position.x, gridClient.currentGrid.pose.position.y);
            });
        }

        activateNavGrid()
        {
            //console.log('NavGrid');
            var nav = new NAV2D.OccupancyGridClientNav({
                ros: this.ros,
                rootObject: viewer.scene,
                viewer: viewer,
                serverName: '/atemr_base',
                withOrientation: true
            });
        }

        resetZoom(){
            zoomView.zoom(1);
        }
        resetPan(){
            panView.panReset();
        }

        activateLaserViz()
        {
            this.scanpts = new ROS2D.ScanPoints({
                ros: this.ros,
                rootObject: viewer.scene,
                points: null
            });
            canVisualizeScan = true;
        }
        visualizeLaserScan(data)
        {
            if(canVisualizeScan)
                this.scanpts.setPoints(data);   
        }
    
    }
    var robot = new ROSConnectionClass('ws://localhost:9090');
    return robot;
});