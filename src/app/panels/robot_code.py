import rospy, rospkg
import psutil as psu
import os, json
import shutil, socket
import ros_numpy
import numpy as np
from sensor_msgs.msg import PointCloud2
from werkzeug.utils import secure_filename
from netifaces import interfaces, ifaddresses, AF_INET
from atemr_msgs.srv import WebService, WebServiceRequest

class RobotHardware():
    def __init__(self) -> None:
        self.first_poll = True
        self.rospack = rospkg.RosPack()
        self.imgPath = self.rospack.get_path('atemr_agent') + '/data/images'
        self.vidPath = self.rospack.get_path('atemr_agent') + '/data/videos'
        self.mapPath = self.rospack.get_path('atemr_localization') + '/maps'
        self.isCoreAlive = False
        self.cloudJS = list()
        self.agentClient = rospy.ServiceProxy('WebUIServer', WebService)
    
    def init_hdw(self):
        rospy.init_node('robot_code_node')
        rospy.Subscriber('/cloud2', PointCloud2, self.cloudCB)
    
    def cloudCB(self, msg):
        try:
            pc = ros_numpy.numpify(msg)
            self.cloudJS.clear()
            length = len(pc)
            for pt in pc[0: length: 2]:
                #print(((tuple(pt))[:2]))
                self.cloudJS.append({'x': str(pt[0]), 'y': str(pt[1])})
        except (Exception, TypeError) as e:
            pass



    '''
        Monitor roscore
        Returns TRUE if ROS-CORE is running and FALSE otherwise
    '''
    def checkCore(self):
        try:
            if(rospy.get_published_topics()):
                if(not self.isCoreAlive):
                    self.init_hdw()
                    self.isCoreAlive = True
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
        tot_m, used_m, free_m = map(int, os.popen('free -t -m').readlines()[-1].split()[1:])
        res = ((used_m/tot_m)) * 100.0
        return round((res if(res <= 100.0) else 100.00), 2)
        #return round(psu.virtual_memory().available * 100 / psu.virtual_memory().total, 2)

    def get_disk_usage(self):
        return psu.disk_usage('/').percent
    
    def list_images(self):
        if(os.path.exists(self.imgPath)):
            return os.listdir(self.imgPath)[:10]
        return list()
    
    def list_videos(self):
        if(os.path.exists(self.vidPath)):
            return os.listdir(self.vidPath)[:10]
        return list()
    
    def list_maps(self):
        if(os.path.exists(self.mapPath)):
            return os.listdir(self.mapPath)[:10]
        return list()
    
    def delete_file(self, file):
        fname, ext = os.path.splitext(file)
        if(ext != ''): #if file has no extension
            print('Not map')
            if(fname == 'allImages'): #delete all images in folder
                imgList = os.listdir(self.imgPath)
                for img in imgList:
                    impath = os.path.join(self.imgPath, img)
                    try:
                        os.remove(impath)
                    except IOError:
                        pass
                return True
            elif(fname == 'allVideos'): # delete all videos in folder
                vidList = os.listdir(self.vidPath)
                for vid in vidList:
                    vidpath = os.path.join(self.vidPath, vid)
                    try:
                        os.remove(vidpath)
                    except IOError:
                        pass
                return True
            else:
                path = os.path.join(self.imgPath, file) if((ext == '.jpeg') or (ext == '.png')) else os.path.join(self.vidPath, file)
                if(os.path.exists(path)):
                    try:
                        os.remove(path)
                    except IOError:
                        pass
                    return True
        else: #delete from map folder
            if(fname == 'allMaps'): #delete all maps in folder
                print('group map')
                mapList = os.listdir(self.mapPath)
                for map in mapList:
                    mappath = os.path.join(self.mapPath, map)
                    try:
                        shutil.rmtree(mappath, ignore_errors=True)
                    except IOError:
                        pass
                return True
            else:
                path = os.path.join(self.mapPath, file)
                if(os.path.exists(path)):
                    try:
                        shutil.rmtree(path, ignore_errors=True)
                    except IOError:
                        pass
                    return True
        return False
    
    def download_file(self, file):
        fname, ext = os.path.splitext(file)
        if(ext != ''): #if has extension
            if(fname == 'allImages'): #download all images in folder
                os.chdir('/tmp')
                return shutil.make_archive(fname, 'zip', self.imgPath)
            elif(fname == 'allVideos'): #download all images in folder
                os.chdir('/tmp')
                return shutil.make_archive(fname, 'zip', self.vidPath)
            else:
                path = os.path.join(self.imgPath, file) if((ext == '.jpeg') or (ext == '.png')) else os.path.join(self.vidPath, file)
                if(os.path.exists(path)):
                    return path
        else: #process as a map request
            os.chdir('/tmp')
            if(fname == 'allMaps'):
                return shutil.make_archive(fname, 'zip', self.mapPath)
            else:
                path = os.path.join(self.mapPath, file)
                if(os.path.exists(path)):
                    return shutil.make_archive(fname, 'zip', path)
        return None
    
    ''' Make service call to the agent '''
    def change_map(self, map_name):
        rospy.wait_for_service('WebUIServer', timeout=5)
        req = WebServiceRequest()
        req.is_map_action.data = True
        req.mapAction = req.CHANGE_MAP
        req.mapName.data = map_name
        try:
            res = self.agentClient.call(req)
            rospy.loginfo('Made call to agent')
            return True if (res.canExecute.data) else False
        except rospy.ServiceException as e:
            pass
        return False
    
    def upload_map(self, data):
        if(not os.path.exists(self.mapPath)):
            os.mkdir(self.mapPath)
        os.chdir(self.mapPath)
        for file in data:
            try:
                fname = secure_filename(file.filename)
            except TypeError:
                return False
            file.save(os.path.join(self.mapPath, fname))
            shutil.unpack_archive(fname)
            os.remove(fname)
        return True
    
    def update_scan(self):
        return self.cloudJS
    
def get_ip():
    #s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    #s.settimeout(0)
    try:
        # doesn't even have to be reachable
        #s.connect(('10.255.255.255', 1))
        #IP = s.getsockname()[0]
        for ifaceName in interfaces():
            if (ifaceName.startswith('wl')):
                IP = [i['addr'] for i in ifaddresses(ifaceName).setdefault(AF_INET, [{'addr':'No IP addr'}] )]
    except Exception:
        IP = '127.0.0.1'
    #finally:
        #s.close()
    '''
    webPath = rospkg.RosPack().get_path('atemr_web_ui') + '/src/'
    data = {}
    data['rosconn'] = []
    data['rosconn'].append({
        'ip': IP
    })
    with open(os.path.join(webPath, 'robot_comm.json'), 'w') as outfile:
        json.dump(data, outfile)
    '''
    return IP
