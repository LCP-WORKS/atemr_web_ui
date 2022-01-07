require(['./utils/socket.io.min', './ros_connection', './utils/chart.min'], function(io, robot, Chart){
    //console.log('I am robot hardware');
    $(document).ready(function(){
        var hdwUpdateID = null;
        var hdwUpdateCounter = 0;
        var isAlive = false;
        var baseurl = window.location.origin;
        if (($(location).attr('pathname').substring(1) === 'control') || ($(location).attr('pathname').substring(1) === 'mapping')){
            const ctx = document.getElementById('myChart').getContext('2d');
            Chart.defaults.color = '#00000';
            var myChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['#cpu', '#ram', '#disk'],
                    datasets: [
                        {
                        label: '% usage',
                        data: [0.0, 0.0, 0.0],
                        backgroundColor: function(context){
                            const index = context.dataIndex;
                            const value = context.dataset.data[index];
                            if(value < 50)
                                return 'rgba(54, 200, 132, 0.8)';
                            else if(value >= 50 && value < 90)
                                return 'rgba(205, 211, 83, 0.8)';
                            else
                                return 'rgba(255, 99, 132, 0.8)';
                        },
                        borderColor: function(context){
                            const index = context.dataIndex;
                            const value = context.dataset.data[index];
                            if(value < 50)
                                return 'rgb(73, 243, 51, 1)';
                            else if(value >= 50 && value < 90)
                                return 'rgb(243, 137, 51, 1)';
                            else
                                return 'rgb(243, 51, 131, 1)';
                        },
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    layout: {
                        padding: 2
                    },
                    plugins: {
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            var showStatus = false;
            $("#idtoggleStatus").on('click', function() {
                if(showStatus === false){
                    document.getElementById("idchartDiv").style.display = "inline-block";
                    showStatus = true;
                } else{
                    document.getElementById("idchartDiv").style.display = "none";
                    showStatus = false;
                }
            });
        }

        var socket = io('/server1');
        socket.on('connectionEvent', function(msg) {
            $('#idhdwConn').text(msg.data);
            document.getElementById("idhdwConn").className = 'connected nopointer btn btn-secondary';
        });

        socket.on('disconnectionEvent', function(msg) {
            $('#idhdwConn').text(msg.data);
            document.getElementById("idhdwConn").className = 'disconnected nopointer btn btn-secondary';
        });

        socket.on("connect_error", (err) => {
            $('#idhdwConn').text('HDW:CRITICAL');
            document.getElementById("idhdwConn").className = 'disconnected nopointer btn btn-secondary';
            console.log(`connect_error due to ${err.message}`);
            if(hdwUpdateCounter >= 4){
                clearInterval(hdwUpdateID);
                socket.disconnect();
            }
            hdwUpdateCounter ++;
          });

        socket.on('errorEvent', function(msg) {
            $('#idhdwConn').text(msg.data);
            document.getElementById("idhdwConn").className = 'disconnected nopointer btn btn-secondary';
        });

        socket.on('update', function(msg) {
            if (($(location).attr('pathname').substring(1) === 'control') || ($(location).attr('pathname').substring(1) === 'mapping')){
                var msgObj = JSON.parse(msg);
                $('#cpuload').text(msgObj.cpu +" %");
                $("#ram").text(msgObj.ram +" %");
                $("#disk").text(msgObj.disk +" %");
                myChart.data.datasets[0].data = [msgObj.cpu, msgObj.ram, msgObj.disk];
                myChart.update();
            }
        });

        socket.on('checkCoreEvent', function(msg) {
            if((msg.data === true) && (!robot.isConnected())){
                robot.connect();
                document.getElementById("idconnStatus").className = 'semi-connected nopointer btn btn-secondary';
                isAlive = false;
            }
            else if((msg.data === true) && (robot.isConnected())){
                document.getElementById("idconnStatus").className = 'connected nopointer btn btn-secondary';
                isAlive = true;
            }
            else{
                document.getElementById("idconnStatus").className = 'disconnected nopointer btn btn-secondary';
                isAlive = false;
            }
            robot.broadcastWebStatus(isAlive);
        });

        //--------------SETTING-------------
        if (($(location).attr('pathname').substring(1) === 'setting')){
            socket.emit('listimages');
            socket.emit('listvideos');
            socket.emit('listmaps');
            socket.on('imgListEvent', function(msg) {
                data = JSON.parse(msg);
                var container = document.getElementById("idimageListDelete");
                var container_dl = document.getElementById("idimageListDownload");
                for(var i = 0; i < data.length; i++){
                    var ali = document.createElement('li');
                    var ahref = document.createElement('a');
                    var linkText = document.createTextNode(data[i]);
                    ahref.appendChild(linkText);
                    ahref.setAttribute("class", "dropdown-item");
                    ahref.setAttribute("href", baseurl + '/delete/' + data[i]);
                    ali.appendChild(ahref);
                    container.appendChild(ali);

                    var linkText_dl = document.createTextNode(data[i]);
                    var ahref_dl = document.createElement('a');
                    ahref_dl.appendChild(linkText_dl);
                    ahref_dl.setAttribute("class", "dropdown-item");
                    ahref_dl.setAttribute("href", baseurl + '/download/' + data[i]);
                    var ali_dl = document.createElement('li');
                    ali_dl.appendChild(ahref_dl);
                    container_dl.appendChild(ali_dl);
                }
            });
            socket.on('vidListEvent', function(msg) {
                data = JSON.parse(msg);
                var container = document.getElementById("idvideoListDelete");
                var container_dl = document.getElementById("idvideoListDownload");
                for(var i = 0; i < data.length; i++){
                    var ali = document.createElement('li');
                    var ahref = document.createElement('a');
                    var linkText = document.createTextNode(data[i]);
                    ahref.appendChild(linkText);
                    ahref.setAttribute("class", "dropdown-item");
                    ahref.setAttribute("href", baseurl + '/delete/' + data[i]);
                    ali.appendChild(ahref);
                    container.appendChild(ali);

                    var linkText_dl = document.createTextNode(data[i]);
                    var ahref_dl = document.createElement('a');
                    ahref_dl.appendChild(linkText_dl);
                    ahref_dl.setAttribute("class", "dropdown-item");
                    ahref_dl.setAttribute("href", baseurl + '/download/' + data[i]);
                    var ali_dl = document.createElement('li');
                    ali_dl.appendChild(ahref_dl);
                    container_dl.appendChild(ali_dl);
                }
            });
        }

        //--------------MAPPING-------------
        if (($(location).attr('pathname').substring(1) === 'mapping')){
            socket.emit('listmaps');
        }
        // ----- MAP event ---------------------------------
        socket.on('mapListEvent', function(msg) {
            data = JSON.parse(msg);
            if (($(location).attr('pathname').substring(1) === 'setting')){
                var container = document.getElementById("idmapListDelete");
                var container_dl = document.getElementById("idmapListDownload");
                for(var i = 0; i < data.length; i++){
                    var ali = document.createElement('li');
                    var ahref = document.createElement('a');
                    var linkText = document.createTextNode(data[i]);
                    ahref.appendChild(linkText);
                    ahref.setAttribute("class", "dropdown-item");
                    ahref.setAttribute("href", baseurl + '/delete/' + data[i]);
                    ali.appendChild(ahref);
                    container.appendChild(ali);

                    var linkText_dl = document.createTextNode(data[i]);
                    var ahref_dl = document.createElement('a');
                    ahref_dl.appendChild(linkText_dl);
                    ahref_dl.setAttribute("class", "dropdown-item");
                    ahref_dl.setAttribute("href", baseurl + '/download/' + data[i]);
                    var ali_dl = document.createElement('li');
                    ali_dl.appendChild(ahref_dl);
                    container_dl.appendChild(ali_dl);
                }
            }else{ //if on MAPPING page
                var container = document.getElementById("idMapSelectList");
                for(var i = 0; i < data.length; i++){
                    var ali = document.createElement('li');
                    var ahref = document.createElement('a');
                    var linkText = document.createTextNode(data[i]);
                    ahref.appendChild(linkText);
                    ahref.setAttribute("class", "dropdown-item");
                    ahref.setAttribute("href", baseurl + '/changemap/' + data[i]);
                    ali.appendChild(ahref);
                    container.appendChild(ali);
                }
            }
            
        });

        //------LASERSCAN visualization ---------------------
        socket.on('tfEvent', function(msg){
            robot.visualizeLaserScan(JSON.parse(msg));
        });
        
        let hdwUpdate = async()=>{
            hdwUpdateID = setInterval(function(){
                socket.emit('update', {'data': 'update-system'});
                socket.emit('updatetf'); 
            }, 1000);
        }
        hdwUpdate();
    });
});