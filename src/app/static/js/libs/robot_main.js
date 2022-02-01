require(['./ros_connection', './robot_utility'], function(robot, utility){
    $(document).ready(function(){
        var canAutomode = false; //proxy variable for robot system states
        var isManualMode = true;
        var resetMode = false;
        var smstate = '';
        var agentStates = '';
        var moduleStates = '';
        var agent_table = document.getElementById("idrobotStatus");
        var modules_table = document.getElementById("idsensorStatus");
        $('[data-toggle="tooltip"]').tooltip();
        $('#idsensorToggle').bootstrapToggle();
        $('#idautomodeModal').modal({ show: false, backdrop: 'static', keyboard: false});
        $('#idrobotStateModal').modal({ show: false, backdrop: 'static', keyboard: false});
        $('#idrecordModal').modal({ show: false, backdrop: 'static', keyboard: false});
        $('#iduserremoveModal').modal({ show: false});
        $('#idimgDeleteModal').modal({show: false});
        $('#idvidDeleteModal').modal({show: false});
        $('#idmapDeleteModal').modal({show: false});
        $('#idmakemapModal').modal({ show: false, backdrop: 'static', keyboard: false});
        var baseurl = window.location.origin;
        var max_ang_vel = 0.0;
        var max_lin_vel = 0.0;
        var robot_ip = '';
        var isStreaming = false;

        utility.readTextFile("robot_ip", function(text){
            robot_ip = JSON.parse(text);
        });
        //Robot Velocity Parameters
        robot.max_linear_vel.get(function(data){
            max_lin_vel = data;
            if (($(location).attr('pathname').substring(1) === 'setting')){
                document.getElementById("idmaxLinVel").value = max_lin_vel * 100;
                document.getElementById("idmaxLinVelVal").textContent = max_lin_vel * 100;
            }
        });
        robot.max_angular_vel.get(function(data){
            max_ang_vel = data;
            if (($(location).attr('pathname').substring(1) === 'setting')){
                document.getElementById("idmaxAngVel").value = max_ang_vel * 100;
                document.getElementById("idmaxAngVelVal").textContent = max_ang_vel * 100;
            }
            robot.kb_teleop.scale = (max_lin_vel + max_ang_vel)/2.0;
        });

        function getRobotStream(){
            robot.cameraStream.subscribe(function(msg){
                document.getElementById('idimgStream').src = "data:image/jpg;base64," + msg.data;
                if((isVidDisplayed === true) && (isStreaming === false) && (robot_ip !== '')){
                    var source_url = "http://" + robot_ip + ":9091/stream?topic=/camera/color/image_raw/compressed&width=640&height=480&type=h264";
                    document.getElementById("idvideoTag").setAttribute("src", source_url);
                    isStreaming = true;
                }
            });
        }

        //CONTROL and MAPPING specific subscribers
        if (($(location).attr('pathname').substring(1) === 'control') || ($(location).attr('pathname').substring(1) === 'mapping')){
            // Current map indicator
            robot.active_map.get(function(data){
                $('#idcurMap').text('ACTIVE MAP: ' + data);
            });

            //AGENT status handler
            robot.agentstatusSub.subscribe(function(msg){
                //console.log('Received: ', msg);
                smstate = msg.agentSMState.data;
                agentStates = get_bits(msg.agentStatus, 5);
                moduleStates = get_bits(msg.hardwareStatus, 8);
                $('#idsmState').text('SM:' + smstate);
                ((smstate === 'IDLE') || (smstate === 'ERROR')) ? $('#idmanautoToggle').bootstrapToggle('enable') : $('#idmanautoToggle').bootstrapToggle('disable');
                canAutomode = (msg.hardwareStatus === 255) ? true : false;
                for (var j = 0, cell; cell = agent_table.cells[j]; j++) {
                    cell.className = (agentStates[j] === '1') ? "available" : "unavailable";
                    if(!resetMode)
                    {// match ROS states with WebUI
                        if((j === 2)){
                            if((agentStates[j] === '1') && (isManualMode)) modeToggle(false);
                            if((agentStates[j] === '0') && (!isManualMode)) modeToggle(true);
                        }
                        resetMode = true;
                    }
                }
                for (var j = 0, cell; cell = modules_table.cells[j]; j++) {
                cell.className = (moduleStates[j] === '1') ? "available" : "unavailable";
                } 
            });

            //BASE feedback handler
            robot.feedbackSub.subscribe(function(msg){
                //msg.meas_vel
                fvel = 8;
                document.getElementById("idfeedbackVelDiv").style.borderColor = (fvel > 10) ? 'rgb(233, 63, 57)' : 'rgb(14, 190, 161)';
                document.getElementById("idfeedbackVelDiv").style.boxShadow = (fvel > 10) ? '-6px -6px 1px 4px rgba(233, 63, 57, 0.473) inset' : '-6px -6px 1px 4px rgba(14, 190, 161, 0.473) inset';
            });

            //CAMERA feed handler
            getRobotStream();
        }
        

        function get_bits(val, size){// returns bit array with initial 0's
            var data = (val).toString(2).split('').reverse().join('');
            var remainingZeroes = new Array((size+1) - data.length).join('0');
            return (data + remainingZeroes).split('').reverse().join('');
        };

        let modeToggle = function(mode){
            if(mode){
                $('#idmanautoToggle').bootstrapToggle('on'); 
                isManualMode = true;
            } else{
                $('#idmanautoToggle').bootstrapToggle('off');
                isManualMode = false;
            }
        };

        $('#idmanautoToggle').change(function(){
            if($(this).prop('checked')){
                //console.log("Manual mode");
                robot.setMode(1); //MANUAL mode
                isManualMode = true;
            } else{
                //console.log("Auto mode");
                if(canAutomode) $('#idautomodeModal').modal('show');
                else{//show warning and reset
                    $('#idrobotStateModal').modal('show');
                    modeToggle(true);
                }
            }
        });
        $('#idsensorToggle').change(function(){
            if($(this).prop('checked')){
                document.getElementById("idsensorStatusDiv").style.display = "block";
            }else {
                document.getElementById("idsensorStatusDiv").style.display = "none";
            }
        });

        $("#idbtnYesAutomode").on('click', function () {
            robot.setMode(2); //AUTOMATIC mode
            modeToggle(false);
        });
        $("#idbtnNoAutomode").on('click', function () {
            modeToggle(true);
        });

        //MEDIA capture
        $("#idcaptureImage").on('click', function(){
            robot.captureMedia(0);
        });

        $('#idrecordToggle').change(function(){
            if($(this).prop('checked')){
                $('#idrecordModal').modal('show');
            } else{
                console.log("Start Record");
                robot.captureMedia(1);
            }
        });
        $("#idbtnSaveVideo").on('click', function () {
            robot.captureMedia(2);
        });
        $("#idbtnCancelVideo").on('click', function () {
            robot.captureMedia(3);
        });

        // VIDEO STREAM Control
        var vidDiv = document.getElementById("idcameraStreamDiv");
        var isVidDisplayed = true;
        $('#idcameraToggle').change(function(){
            if($(this).prop('checked')){
                if(!isVidDisplayed){
                    /*var vstrm = document.createElement('video');
                    vstrm.id = "idvideoTag";
                    vstrm.src = "http://127.0.0.1:9091/stream?topic=/camera/color/image_raw/compressed&width=640&height=480&type=h264";
                    vstrm.width = 800;
                    vstrm.height = 380;
                    vstrm.autoplay = true;
                    if(($(location).attr('pathname').substring(1) === 'control')){
                        vstrm.controls = true;
                    }
                    vidDiv.appendChild(vstrm);*/
                    document.getElementById("idvideoTag").style.display = "initial";
                    document.getElementById("idimgStream").style.display = "initial";
                    getRobotStream();
                    isVidDisplayed = true;
                }
            } else{
                if(isVidDisplayed){ //stop streaming 
                    //document.getElementById("idvideoTag").remove();
                    document.getElementById("idvideoTag").setAttribute("src", "");
                    document.getElementById("idvideoTag").style.display = "none";
                    document.getElementById("idimgStream").style.display = "none";
                    robot.cameraStream.unsubscribe();
                    isVidDisplayed = false;
                    isStreaming = false;
                    if(robot_ip === ''){ //query for Robot IP if none
                        utility.readTextFile("robot_ip", function(text){
                            robot_ip = JSON.parse(text);
                        });
                    }
                }
            }
        });

        //MAP Interface
        //Reset Zoom
        $('#idresetZoom').on('click',function(){
            robot.resetZoom();
        });
        //Reset Pan
        $('#idresetPan').on('click',function(){
            robot.resetPan();
        });

        //------------------------SETTINGS PAGE ------------------------------------------------------------
        if (($(location).attr('pathname').substring(1) === 'setting')){
            var linVelSlider = document.getElementById("idmaxLinVel");
            var angVelSlider = document.getElementById("idmaxAngVel");
            linVelSlider.oninput = linFunc;
            function linFunc(){
                document.getElementById("idmaxLinVelVal").textContent = linVelSlider.value;
            }
            angVelSlider.oninput = angFunc;
            function angFunc(){
                document.getElementById("idmaxAngVelVal").textContent = angVelSlider.value;
            }
            robot.dbusSub.subscribe(function(msg){
                document.getElementById("idConnName").textContent = msg.data;
            });
        }else robot.dbusSub.unsubscribe();
        
        $('#idbtnremoveUser').on('click',function(){
            $('#iduserremoveModal').modal('show');
        });
        $('#idbtnruContinue').on('click', function(){
            var url = baseurl + '/auth/removeuser/' + document.getElementById("inptremoveUser").value;
            window.location.href = url;
        });
        $('#idbtnSaveParams').on('click', function(){
            var ssid = document.getElementById("idconnSSID").value;
            var passwd = document.getElementById("idconnPASS").value;
            if((ssid !== '') && (passwd !== ''))
                robot.sendWifiConfig(ssid, passwd);
            
            max_lin_vel = linVelSlider.value / 100.0;
            max_ang_vel = angVelSlider.value / 100.0;
            robot.kb_teleop.scale = (max_lin_vel + max_ang_vel)/2.0;
            robot.max_linear_vel.set(max_lin_vel, function(){});
            robot.max_angular_vel.set(max_ang_vel, function(){});
        });
        //              ------------------IMG modal 
        $('#idbtnDeleteImage').on('click', function(){
            $('#idimgDeleteModal').modal('show');
        });
        $('#idbtnYesImageDelete').on('click', function(){
            var url = baseurl + '/delete/allImages.jpeg';
            window.location.href = url;
        });
        //              ------------------VID modal 
        $('#idbtnDeleteVideo').on('click', function(){
            $('#idvidDeleteModal').modal('show');
        });
        $('#idbtnYesVideoDelete').on('click', function(){
            var url = baseurl + '/delete/allVideos.avi';
            window.location.href = url;
        });
        //              ------------------MAP modal 
        $('#idbtnDeleteMap').on('click', function(){
            $('#idmapDeleteModal').modal('show');
        });
        $('#idbtnYesMapDelete').on('click', function(){
            var url = baseurl + '/delete/allMaps';
            window.location.href = url;
        });


        //------------------------MAPPING PAGE ------------------------------------------------------------
        $('#idbeginMappingToggle').change(function(){
            if($(this).prop('checked')){
                //console.log("End map");
                $('#idmakemapModal').modal('show');
            } else{
                //console.log("Begin map");
                robot.makeMap(31);
            }
        });
        $('#idbtnYesMakemap').on('click', function(){
            var mapname = document.getElementById("idmapnameMakemap").value;
            if(mapname !== ''){
                //console.log('Map name: ', mapname);
                robot.makeMap(33, mapname);
            }
            else{
                //console.log('Map name is empty');
                $('#idbeginMappingToggle').bootstrapToggle('off');
            }
        });
        $('#idbtnNoMakemap').on('click', function(){
            //console.log("Discard map");
            robot.makeMap(34);
        });
    });
});
