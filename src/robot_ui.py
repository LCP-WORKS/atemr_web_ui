#!/usr/bin/env python3

from app import create_app, db, socketio
from app.models import User
import signal, sys
#from app.panels.robot_code import get_ip

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return {'db': db, 'User': User}

def signal_handler(sig, frame):
    print('User Interrupt!')
    socketio.stop()
    sys.exit(0)


if __name__ == '__main__':
    signal.signal(signal.SIGINT, signal_handler)
    #print('Current IP is: ', get_ip())
    try:
        socketio.run(app, host='0.0.0.0')
    except KeyboardInterrupt:
        print('User Interrupt!')