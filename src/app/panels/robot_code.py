import rospy, rospkg
import tf, tf2_ros
import psutil as psu
import os, json
import shutil, socket
from nav_msgs.srv import LoadMap
from werkzeug.utils import secure_filename

class RobotHardware():
    def __init__(self) -> None:
        self.first_poll = True
        self.rospack = rospkg.RosPack()
        self.imgPath = self.rospack.get_path('atemr_agent') + '/data/images'
        self.vidPath = self.rospack.get_path('atemr_agent') + '/data/videos'
        self.mapPath = self.rospack.get_path('atemr_localization') + '/maps'

        rospy.init_node('robot_code_node')
        self.listener = tf.TransformListener()
    
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
    
    def change_map(self, map_name):
        map_url = os.path.join(self.mapPath, map_name, map_name + '.yaml')
        rospy.wait_for_service('change_map', timeout=5)
        try:
            change_map_proxy = rospy.ServiceProxy('change_map', LoadMap)
            resp = change_map_proxy(map_url)
            return True if(resp.result == 0) else False
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
    
    def update_tf(self):
        try:
            self.listener.waitForTransform("map", "laser", rospy.Time(), rospy.Duration(3.0))
            t = self.listener.getLatestCommonTime("map", "laser")
            (trans, rot) = self.listener.lookupTransform('map', 'laser', t)
            return (trans, rot)
        except (tf.LookupException, tf.ConnectivityException, tf.ExtrapolationException, tf2_ros.TransformException):
            return None
        return None
    
def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.settimeout(0)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
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
