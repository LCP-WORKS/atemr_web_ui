import time
import rospy
import psutil as psu

class RobotHardware():
    def __init__(self) -> None:
        self.first_poll = True
    
    '''
        Monitor roscore
        Returns TRUE if ROS-CORE is running and FALSE otherwise
    '''
    def checkCore(self):
        try:
            if(rospy.get_published_topics()):
                return True
        except ConnectionRefusedError as e:
            return False

    def get_cpu_load(self):
        cpuload = psu.cpu_percent()
        if(self.first_poll):
            self.first_poll = False
            return psu.cpu_percent()
        return cpuload

    def get_vmem(self):
        return round(psu.virtual_memory().available * 100 / psu.virtual_memory().total, 2)

    def get_disk_usage(self):
        return psu.disk_usage('/').percent
    