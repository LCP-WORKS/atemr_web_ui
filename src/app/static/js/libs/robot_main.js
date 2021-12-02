require(['./ros_connection'], function(){
    $(document).ready(function(){
        var canAutomode = false; //proxy variable for robot system states
        $('[data-toggle="tooltip"]').tooltip();
        $('#idsensorToggle').bootstrapToggle();
        $('#idautomodeModal').modal({ show: false, backdrop: 'static', keyboard: false});
        $('#idrobotStateModal').modal({ show: false});

        let manualMode = function(mode){
            (mode) ? $('#idmanautoToggle').bootstrapToggle('on') : $('#idmanautoToggle').bootstrapToggle('off');
        };

        $('#idmanautoToggle').change(function(){
            if($(this).prop('checked')){
                console.log("Manual mode");
            } else{
                console.log("Auto mode");
                if(canAutomode){
                    $('#idautomodeModal').modal('show');
                } else{
                    $('#idrobotStateModal').modal('show');
                    manualMode(true);
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
            // send instruction to go into Automode
            console.log('yes');
        });
        $("#idbtnNoAutomode").on('click', function () {
            manualMode(true);
        });
    });
});
