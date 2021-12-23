require(['./ros_connection'], function(robot){
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
        $('#idrobotStateModal').modal({ show: false});

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
                console.log("Manual mode");
                robot.setMode(1); //MANUAL mode
                isManualMode = true;
            } else{
                console.log("Auto mode");
                if(canAutomode) $('#idautomodeModal').modal('show');
                else{//show warning and reset
                    $('#idrobotStateModal').modal('show');
                    modeToggle(true);
                }
            }
        });
        $('#idsensorToggle').change(function(){
            if($(this).prop('checked')){
                console.log("Displaying sensor statuses");
                document.getElementById("idsensorStatusDiv").style.display = "block";
            }else {
                console.log("NOT displaying sensor statuses"); 
                document.getElementById("idsensorStatusDiv").style.display = "none";
            }
        });

        $("#idbtnYesAutomode").on('click', function () {
            console.log('yes');
            robot.setMode(2); //AUTOMATIC mode
            modeToggle(false);
        });
        $("#idbtnNoAutomode").on('click', function () {
            modeToggle(true);
        });

        // VIDEO STREAM Control
        var vidDiv = document.getElementById("idcameraStreamDiv");
        var isVidDisplayed = true;
        /*var vid = document.getElementById("idvideoTag");
        var overlay = document.getElementById("video-overlay");
        var videoPlaying = true;
        function hideOverlay() {
            overlay.style.display = "none";
            videoPlaying = true;
            vid.play();
            console.log('playing');
        }
        function showOverlay() {
            overlay.style.display = "block";
            videoPlaying = true;
            console.log('NOT playing');
        }
        vid.addEventListener('pause', showOverlay);
        overlay.addEventListener('click', hideOverlay);
        */
        $('#idcameraToggle').change(function(){
            if($(this).prop('checked')){
                if(!isVidDisplayed){
                    var vstrm = document.createElement('video');
                    vstrm.id = "idvideoTag";
                    vstrm.src = "http://127.0.0.1:9091/stream?topic=/rs_cam/colour/image_raw&width=800&height=380&type=h264";
                    vstrm.width = 800;
                    vstrm.height = 380;
                    vstrm.autoplay = true;
                    if(($(location).attr('pathname').substring(1) === 'control')){
                        vstrm.controls = true;
                        vstrm.poster= "{{url_for('static', filename='img/play.png') | safe}}";
                    }
                    vidDiv.appendChild(vstrm);
                    isVidDisplayed = true;
                }
            } else{
                if(isVidDisplayed){
                    document.getElementById("idvideoTag").remove();
                    isVidDisplayed = false;
                }
            }
        });

        //NAV-GOAL interface
        var cansendGoal = false;
        $('#idgoalToggle').change(function(){
            if($(this).prop('checked')){
                if(cansendGoal){
                    console.log('pan');
                    cansendGoal = false;
                }
            } else{
                if(!cansendGoal){
                    console.log('goal');
                    cansendGoal = true;
                }
            }
        });
    });
});
