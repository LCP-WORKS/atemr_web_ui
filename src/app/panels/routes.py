from datetime import datetime
from flask import render_template, flash, redirect, url_for, request, g, jsonify, current_app, send_file
from flask_login import current_user, login_required
from app import db, socketio
from app.panels import bp
from app.panels.robot_socket import RobotSpace
from app.panels.robot_code import RobotHardware, get_ip
from app.panels.forms import UploadForm

robotHDW = RobotHardware()

@bp.before_app_request
def before_request():
    if current_user.is_authenticated:
        current_user.last_seen = datetime.utcnow()
        db.session.commit()


@bp.route('/', methods=['GET', 'POST'])
@bp.route('/index', methods=['GET', 'POST'])
@bp.route('/control', methods=['GET', 'POST'])
@login_required
def control():
    return render_template('panels/control.html', title='ControlPanel')

@bp.route('/robot_ip', methods=['GET'])
def robot_ip():
    return jsonify(get_ip())


@bp.route('/mapping', methods=['GET', 'POST'])
@login_required
def mapping():
    form = UploadForm()
    if form.validate_on_submit():
        print('Passed validation ')
        res = robotHDW.upload_map(form.files.data)
        flash('Upload successful!') if(res is True) else flash('Upload failed!')
        return redirect(url_for('panels.mapping'))
    return render_template('panels/mapping.html', title='Mapping', user=current_user, form=form)

@bp.route('/setting')
@login_required
def settings():
    return render_template('panels/setting.html', title='Setting', user=current_user)

@bp.route('/download/<filename>', methods=['GET'])
@login_required
def download(filename):
    dl = robotHDW.download_file(filename)
    if (dl is None):
        flash('Unable to download file!!')
        return redirect(url_for('panels.setting'))
    return send_file(dl, as_attachment=True)

@bp.route('/delete/<filename>', methods=['GET'])
@login_required
def delete(filename):
    res = robotHDW.delete_file(filename)
    if (res is False):
        flash('Unable to delete file!!')
        return redirect(url_for('panels.settings'))
    flash('File successfully deleted!!')
    return redirect(url_for('panels.settings'))

@bp.route('/changemap/<filename>', methods=['GET'])
@login_required
def changemap(filename):
    res = robotHDW.change_map(filename)
    if (res is False):
        flash('Unable to change MAP!!')
        return redirect(url_for('panels.mapping'))
    flash('MAP successfully changed!!')
    return redirect(url_for('panels.mapping'))

'''WEBSOCKET code'''
socketio.on_namespace(RobotSpace('/server1'))
