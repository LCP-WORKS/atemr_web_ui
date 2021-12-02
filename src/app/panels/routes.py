from datetime import datetime
from flask import render_template, flash, redirect, url_for, request, g, jsonify, current_app
from flask_login import current_user, login_required
from app import db, socketio
from app.panels.forms import EditProfileForm, EmptyForm, PostForm
from app.models import User
from app.panels import bp
from app.panels.robot_socket import RobotSpace


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


@bp.route('/mapping')
@login_required
def mapping():
    return render_template('panels/mapping.html', title='Mapping', user=current_user)

@bp.route('/setting')
@login_required
def settings():
    return render_template('panels/setting.html', title='Setting', user=current_user)

@bp.route('/user/<username>')
@login_required
def user(username):
    user = User.query.filter_by(username=username).first_or_404()
    return render_template('main/user.html', title='User', user=user)



'''WEBSOCKET code'''
socketio.on_namespace(RobotSpace('/server1'))
