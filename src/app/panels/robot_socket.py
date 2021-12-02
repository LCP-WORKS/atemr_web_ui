from flask_socketio import Namespace, emit
import random, json
from app.panels.robot_code import RobotHardware

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
        emit('checkCoreEvent', {'data': self.robot.checkCore()})
    
    def on_error(self, e):
        print('Error occured: ' + str(e))