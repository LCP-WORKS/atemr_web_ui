require(['./ros_connection'], function(robot){
  createJoystick = function () {
    var options = {
      zone: document.getElementById('zone_joystick'),
      threshold: 0.1,
      position: {left: 50 + '%' },
      mode: 'static',
      size: 150,
      color: '#000000',
    };
    manager = nipplejs.create(options);
  
    linear_speed = 0;
    angular_speed = 0;
    move = function(vel_x, vel_z){
      //! print base velocity to ui
      var twist = new ROSLIB.Message({
          linear : {
            x : vel_x,
            y : 0.0,
            z : 0.0
          },
          angular : {
            x : 0.0,
            y : 0.0,
            z : vel_z
          }
        });
        robot.joyPub.publish(twist);
    };
  
    self.manager.on('start', function (event, nipple) {
        timer = setInterval(function () {
            move(linear_speed, angular_speed);
          }, 25);
    });
  
    self.manager.on('move', function (event, nipple) {
        max_linear = 1.0; // m/s
        max_angular = 0.5; // rad/s
        max_distance = 75.0; // pixels;
        linear_speed = Math.sin(nipple.angle.radian) * max_linear * nipple.distance/max_distance;
        angular_speed = -Math.cos(nipple.angle.radian) * max_angular * nipple.distance/max_distance;
    });
  
    self.manager.on('end', function () {
        if (timer) {
            clearInterval(timer);
          }
          self.move(0.0, 0.0);
    });
  }
});

if(($(location).attr('pathname').substring(1) === 'control') || ($(location).attr('pathname').substring(1) === 'mapping'))
{
  window.onload = function () {
      createJoystick();
    }
}