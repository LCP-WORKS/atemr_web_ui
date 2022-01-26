from flask_socketio import Namespace, emit
import json
from app.panels.robot_code import RobotHardware, get_ip

class RobotSpace(Namespace):
    def __init__(self, namespace=None):
        super().__init__(namespace=namespace)
        self.robot = RobotHardware()
    def on_connect(self):
        print('Client connected')
        emit('connectionEvent', {'data': 'HDW:ONLINE'})

    def on_disconnect(self):
        print('Client disconnected')
        emit('disconnectionEvent', {'data': 'HDW:OFFLINE'})

    def on_update(self, msg):
        #print('Received: ', msg['data'])
        emit('update', 
                json.dumps(dict(cpu=self.robot.get_cpu_load(), 
                                ram=self.robot.get_vmem(), 
                                disk=self.robot.get_disk_usage())))
        emit('checkCoreEvent', {'data': self.robot.checkCore()}) #check roscore alive status
    
    def on_error(self, e):
        print('Error occured: ' + str(e))
        emit('errorEvent', {'data': 'HDW:CRITICAL'})
    
    #MEDIA serve and manipulation
    def on_listimages(self):
        emit('imgListEvent', json.dumps(self.robot.list_images()))
    
    def on_listvideos(self):
        emit('vidListEvent', json.dumps(self.robot.list_videos()))
    
    def on_listmaps(self):
        emit('mapListEvent', json.dumps(self.robot.list_maps()))
    
    #LASERSCAN visualization
    def on_updatescan(self):
        res = self.robot.update_scan()
        if(len(res) != 0):
            emit('scanEvent', json.dumps(res))
